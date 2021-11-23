# Release

How to perform a release.

1. Run `npm version x.y.z` at the root of the repository
2. Push your changes with the tag: `git push origin main --tags`

The release process is automated and relies on GitHub Actions.
It will automatically publish the `asciidoctor-pdf` package on https://npmjs.com.
In addition, it will create a release and upload artifacts on GitHub.

The `NPM_TOKEN` secret is configured on GitHub.
See the `.github/workflows/release.yml` file for details.
