# .idx/dev.nix
# This file defines the development environment for the project using Nix.

{ pkgs, ... }:
{
  # Specifies the Nix channel to ensure consistent package versions.
  # `stable-24.05` is a recent and stable choice.
  channel = "stable-24.05";

  # Lists the packages to be installed in the environment.
  # The IDX system automatically adds these to the system's PATH.
  packages = [
    # Core development tools
    pkgs.nodejs_20       # Node.js runtime (v20)
    pkgs.pnpm            # PNPM package manager
    pkgs.google-cloud-sdk  # Google Cloud CLI tools
    pkgs.openjdk         # Java Development Kit (for Firebase Emulators)
    pkgs.sudo
    # Suggested utility for improved developer experience
    pkgs.ripgrep         # A fast, recursive search tool
  ];

  # Sets environment variables for the development session.
  # CRITICAL: If the `env` attribute is present, any PATH modification
  # MUST be a list. All other variables can be strings.
  # By only defining non-PATH variables, we avoid conflicts.
  env = {
    NODE_ENV = "development";
  };

  # Defines IDX-specific configurations.
  idx = {
    # Lists VS Code extensions to recommend or install.
    extensions = [];

    # Configures the preview panel within the IDX editor.
    # The structure `previews.previews.web` is the correct, required format.
    previews = {
      enable = true;
      previews = {
        web = {
          command = [ "pnpm" "run" "dev" ];
          manager = "web";
        };
      };
    };
  };
}
