"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.downloadCuectl = exports.getCuectlDownloadURL = exports.getLatestCuectlVersion = exports.isValidRelease = exports.getCuectlOSArchitecture = exports.getExecutableExtension = void 0;
const os = require("os");
const path = require("path");
const util = require("util");
const fs = require("fs");
const toolCache = require("@actions/tool-cache");
const core = require("@actions/core");
const semver = require("semver");
const cuectlToolName = 'cue';
const stableCuectlVersion = 'v0.4.0';
const cuectlAllReleasesUrl = 'https://api.github.com/repos/cue-lang/cue/releases';
function getExecutableExtension() {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}
exports.getExecutableExtension = getExecutableExtension;
function getCuectlOSArchitecture() {
    let arch = os.arch();
    if (arch === 'x64') {
        return 'amd64';
    }
    return arch;
}
exports.getCuectlOSArchitecture = getCuectlOSArchitecture;
// toCheck is valid if it's not a release candidate and greater than the builtin stable version
function isValidRelease(toCheck, stable) {
    return toCheck.toString().indexOf('rc') == -1 && semver.gt(toCheck, stable);
}
exports.isValidRelease = isValidRelease;
function getLatestCuectlVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const downloadPath = yield toolCache.downloadTool(cuectlAllReleasesUrl);
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
        }
        catch (error) {
            core.warning(util.format("Cannot get the latest cue releases infos from %s. Error %s. Using default builtin version %s.", cuectlAllReleasesUrl, error, stableCuectlVersion));
        }
        return stableCuectlVersion;
    });
}
exports.getLatestCuectlVersion = getLatestCuectlVersion;
function getCuectlDownloadURL(version, arch) {
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
exports.getCuectlDownloadURL = getCuectlDownloadURL;
function downloadCuectl(version) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!version) {
            version = yield getLatestCuectlVersion();
        }
        let cachedToolpath = toolCache.find(cuectlToolName, version);
        let cuectlDownloadPath = '';
        let extractedCuectlPath = '';
        let arch = getCuectlOSArchitecture();
        if (!cachedToolpath) {
            try {
                cuectlDownloadPath = yield toolCache.downloadTool(getCuectlDownloadURL(version, arch));
                if (os.type() === 'Windows_NT') {
                    extractedCuectlPath = yield toolCache.extractZip(cuectlDownloadPath);
                }
                else {
                    extractedCuectlPath = yield toolCache.extractTar(cuectlDownloadPath);
                }
            }
            catch (exception) {
                if (exception instanceof toolCache.HTTPError && exception.httpStatusCode === 404) {
                    throw new Error(util.format("Cuectl '%s' for '%s' arch not found.", version, arch));
                }
                else {
                    throw new Error('DownloadCuectlFailed');
                }
            }
            let toolName = cuectlToolName + getExecutableExtension();
            cachedToolpath = yield toolCache.cacheDir(extractedCuectlPath, toolName, cuectlToolName, version);
        }
        const cuectlPath = path.join(cachedToolpath, cuectlToolName + getExecutableExtension());
        fs.chmodSync(cuectlPath, '777');
        return cuectlPath;
    });
}
exports.downloadCuectl = downloadCuectl;
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let version = core.getInput('version', { 'required': true });
        if (version.toLocaleLowerCase() === 'latest') {
            version = yield getLatestCuectlVersion();
        }
        core.debug(util.format("Downloading CUE version %s", version));
        let cachedCuectlPath = yield downloadCuectl(version);
        core.addPath(path.dirname(cachedCuectlPath));
        console.log(`CUE binary version: '${version}' has been cached at ${cachedCuectlPath}`);
        core.setOutput('cuectl-path', cachedCuectlPath);
    });
}
exports.run = run;
run().catch(core.setFailed);
