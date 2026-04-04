{
  description = "Flutter development shell for Anime Image Downloader";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; config.android_sdk.accept_license = true; };
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            flutter
            dart
            git
            jdk17
            cmake
            ninja
            pkg-config
            clang
            gtk3
            libepoxy
            pcre2
            xorg.libX11
            xorg.libXi
            xorg.libXcursor
            xorg.libXrandr
            xorg.libXinerama
            xorg.libXext
            xorg.libXrender
            glib
          ];

          shellHook = ''
            export JAVA_HOME=${pkgs.jdk17}
            export CHROME_EXECUTABLE=""
            echo "Flutter dev shell ready"
          '';
        };
      });
}
