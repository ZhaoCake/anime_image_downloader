{
  description = "Anime Image Downloader dev shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
    in {
      devShells.${system}.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          pkg-config
          openssl
          glib
          gtk3
          webkitgtk_4_1
          libsoup_3
          librsvg
          libayatana-appindicator
          mesa
          libglvnd
          xorg.libX11
          xorg.libXcursor
          xorg.libXrandr
          xorg.libXi
          xorg.libXrender
          lld
          wasm-bindgen-cli
          binaryen
          trunk
          cargo
          rustc
          rustfmt
          clippy
          nodejs_20
        ];

        shellHook = ''
          export PKG_CONFIG_PATH="${pkgs.openssl.dev}/lib/pkgconfig:${pkgs.glib.dev}/lib/pkgconfig:${pkgs.gtk3.dev}/lib/pkgconfig:${pkgs.webkitgtk_4_1.dev}/lib/pkgconfig:${pkgs.libsoup_3.dev}/lib/pkgconfig:${pkgs.librsvg.dev}/lib/pkgconfig:${pkgs.libayatana-appindicator.dev}/lib/pkgconfig:$PKG_CONFIG_PATH"
          export GDK_BACKEND=x11
          export WEBKIT_DISABLE_COMPOSITING_MODE=1
          export LIBGL_ALWAYS_SOFTWARE=1
        '';
      };
    };
}
