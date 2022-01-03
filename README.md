***IMPORTANT: This project has been archived and is part of the official [cue-lang](https://github.com/cue-lang/) org! Please use the official [action](https://github.com/cue-lang/setup-cue) and not this one!***

# Setup CUE

***Install a specific [CUE](https://github.com/cue-lang/cue) cli version on your Github Actions runner***

You want to use this action in your github actions workflow to install a specific version of [CUE](https://github.com/cue-lang/cue) on your runner. `version` is a semantic version string like `v0.4.0`. You can also use the keyword `latest` (default) to use the latest stable release of `cue`. Releases of `cue` are listed [here](https://github.com/cue-lang/cue/releases).

```
- uses: moia-oss/setup-cue@v1
  with:
    version: '<version>' # default is latest
  id: install
```

Please refer to the `actions.yml` file for details about all the inputs. The cached `cue` binary path is prepended to the `PATH` environment variable and can be executed directly in further workflow steps. It is also stored in the `cuectl-path` output variable.

## Contributing

This project welcomes contributions or suggestions of any kind. Please feel free to create an issue to discuss changes or create a Pull Request if you see room for improvement.
