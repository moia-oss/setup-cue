import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';

import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
import * as semver from 'semver';

const cuectlToolName = 'cue';
const stableCuectlVersion = 'v0.4.0';
const cuectlAllReleasesUrl = 'https://api.github.com/repos/cue-lang/cue/releases';

export function getExecutableExtension(): string {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}

export function getCuectlOSArchitecture(): string {
    let arch = os.arch();
    if (arch === 'x64') {
        return 'amd64';
    }
    return arch;
}

// toCheck is valid if it's not a release candidate and greater than the builtin stable version
export function isValidRelease(toCheck, stable: string): boolean {
    return toCheck.toString().indexOf('rc') == -1 && semver.gt(toCheck, stable)
}

export async function getLatestCuectlVersion(): Promise<string> {
    try {
        const downloadPath = await toolCache.downloadTool(cuectlAllReleasesUrl);
        const responseArray = JSON.parse(fs.readFileSync(downloadPath, 'utf8').toString().trim());
        let latestCuectlVersion = semver.clean(stableCuectlVersion);
        responseArray.forEach(response => {
            if (response && response.tag_name) {
                let selectedCuectlVersion = semver.clean(response.tag_name.toString());
                if (selectedCuectlVersion) {
                    if (isValidRelease(selectedCuectlVersion, latestCuectlVersion)) {
                        latestCuectlVersion = selectedCuectlVersion;
                    }
                }
            }
        });
        return "v" + latestCuectlVersion;
    } catch (error) {
        core.warning(util.format("Cannot get the latest cue releases infos from %s. Error %s. Using default builtin version %s.", cuectlAllReleasesUrl, error, stableCuectlVersion));
    }

    return stableCuectlVersion;
}

export function getCuectlDownloadURL(version: string, arch: string): string {
    switch (os.type()) {
        case 'Linux':
            return util.format('https://github.com/cue-lang/cue/releases/download/%s/cue_%s_linux_%s.tar.gz', version, version, arch);

        case 'Darwin':
            return util.format('https://github.com/cue-lang/cue/releases/download/%s/cue_%s_darwin_%s.tar.gz', version, version, arch);

        case 'Windows_NT':
        default:
            return util.format('https://github.com/cue-lang/cue/releases/download/%s/cue_%s_windows_%s.zip', version, version, arch);

    }
}

export async function downloadCuectl(version: string): Promise<string> {
    if (!version) { version = await getLatestCuectlVersion(); }
    let cachedToolpath = toolCache.find(cuectlToolName, version);
    let cuectlDownloadPath = '';
    let extractedCuectlPath = '';
    let arch = getCuectlOSArchitecture();
    if (!cachedToolpath) {
        try {
            cuectlDownloadPath = await toolCache.downloadTool(getCuectlDownloadURL(version, arch));
            if(os.type() === 'Windows_NT') {
                extractedCuectlPath = await toolCache.extractZip(cuectlDownloadPath);
            } else {
                extractedCuectlPath = await toolCache.extractTar(cuectlDownloadPath);
            }
        } catch (exception) {
            if (exception instanceof toolCache.HTTPError && exception.httpStatusCode === 404) {
                throw new Error(util.format("Cuectl '%s' for '%s' arch not found.", version, arch));
            } else {
                throw new Error('DownloadCuectlFailed');
            }
        }

        let toolName = cuectlToolName + getExecutableExtension()
        cachedToolpath = await toolCache.cacheDir(extractedCuectlPath, toolName, cuectlToolName, version);
    }

    const cuectlPath = path.join(cachedToolpath, cuectlToolName + getExecutableExtension());
    fs.chmodSync(cuectlPath, '777');
    return cuectlPath;
}

export async function run() {
    let version = core.getInput('version', { 'required': true });
    if (version.toLocaleLowerCase() === 'latest') {
        version = await getLatestCuectlVersion();
    }

    core.debug(util.format("Downloading CUE version %s", version));
    let cachedCuectlPath = await downloadCuectl(version);

    core.addPath(path.dirname(cachedCuectlPath));
            
    console.log(`CUE binary version: '${version}' has been cached at ${cachedCuectlPath}`);
    core.setOutput('cuectl-path', cachedCuectlPath);
}


run().catch(core.setFailed);
