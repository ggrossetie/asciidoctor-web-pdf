# Release

How to perform a release.

1. Go to the [Release workflow](https://github.com/ggrossetie/asciidoctor-web-pdf/actions/workflows/release.yml) on GitHub Actions
2. Click **Run workflow**, enter the version (e.g., `1.0.0-alpha.17`), and confirm

The release process is fully automated and will:

- Build binaries for macOS arm64, Linux x64, Linux arm64, and Windows x64
- Run lint and tests
- Bump the version, commit, and push the tag to `main`
- Publish the `asciidoctor-pdf` package to https://npmjs.com
- Create a GitHub release with the binary artifacts attached
- Publish Docker images to Docker Hub

The following secrets must be configured on the repository:
- `DOCKER_USERNAME` / `DOCKER_PASSWORD` — Docker Hub credentials

See the `.github/workflows/release.yml` file for details.
