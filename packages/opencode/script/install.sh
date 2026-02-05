#!/usr/bin/env bash
#
# OpenCode Installation Script
#
# Public repo usage:
#   curl -fsSL https://raw.githubusercontent.com/Nuvai/opencode/main/packages/opencode/script/install.sh | bash
#
# Private repo usage:
#   curl -fsSL -H "Authorization: token YOUR_GITHUB_TOKEN" \
#     https://raw.githubusercontent.com/Nuvai/opencode/main/packages/opencode/script/install.sh | \
#     GITHUB_TOKEN=YOUR_GITHUB_TOKEN bash
#
# Options (via environment variables):
#   GITHUB_TOKEN          - GitHub token for private repo access (required for private repos)
#   OPENCODE_INSTALL_DIR  - Override installation directory
#   OPENCODE_VERSION      - Specific version to install (default: latest)
#   OPENCODE_BASELINE     - Set to 1 for baseline (non-AVX2) builds
#   OPENCODE_NO_MODIFY_PATH - Set to 1 to skip shell profile modification
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
REPO="Nuvai/opencode"
BINARY_NAME="opencode"
VERSION="${OPENCODE_VERSION:-latest}"
BASELINE="${OPENCODE_BASELINE:-0}"
NO_MODIFY_PATH="${OPENCODE_NO_MODIFY_PATH:-0}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

# Build auth header for curl if token is provided
auth_header() {
    if [ -n "$GITHUB_TOKEN" ]; then
        echo "Authorization: token $GITHUB_TOKEN"
    fi
}

info() {
    echo -e "${BLUE}==>${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}!${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1" >&2
    exit 1
}

# Detect OS
detect_os() {
    local os
    os="$(uname -s)"
    case "$os" in
        Linux*)  echo "linux" ;;
        Darwin*) echo "darwin" ;;
        MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
        *) error "Unsupported operating system: $os" ;;
    esac
}

# Detect architecture
detect_arch() {
    local arch
    arch="$(uname -m)"
    case "$arch" in
        x86_64|amd64) echo "x64" ;;
        arm64|aarch64) echo "arm64" ;;
        armv7l) echo "arm" ;;
        *) error "Unsupported architecture: $arch" ;;
    esac
}

# Detect libc (for Linux)
detect_libc() {
    if [ "$(detect_os)" != "linux" ]; then
        echo ""
        return
    fi

    # Check for musl
    if ldd --version 2>&1 | grep -qi musl; then
        echo "musl"
    elif [ -f /etc/alpine-release ]; then
        echo "musl"
    else
        echo ""  # glibc (default)
    fi
}

# Get platform-appropriate install directory
get_install_dir() {
    local os="$1"

    # User override takes precedence
    if [ -n "${OPENCODE_INSTALL_DIR:-}" ]; then
        echo "$OPENCODE_INSTALL_DIR"
        return
    fi

    case "$os" in
        darwin)
            # macOS: prefer ~/.local/bin (modern) or fall back to /usr/local/bin
            if [ -d "$HOME/.local/bin" ] || [ -w "$HOME/.local" ] || [ -w "$HOME" ]; then
                echo "$HOME/.local/bin"
            else
                echo "/usr/local/bin"
            fi
            ;;
        linux)
            # Linux: XDG-compliant ~/.local/bin
            echo "${XDG_BIN_HOME:-$HOME/.local/bin}"
            ;;
        windows)
            # Windows (Git Bash/MSYS): use AppData
            echo "${LOCALAPPDATA:-$HOME/AppData/Local}/Programs/opencode"
            ;;
    esac
}

# Get user's shell profile file
get_shell_profile() {
    local shell_name
    shell_name="$(basename "${SHELL:-/bin/bash}")"

    case "$shell_name" in
        zsh)
            if [ -f "$HOME/.zshrc" ]; then
                echo "$HOME/.zshrc"
            else
                echo "$HOME/.zprofile"
            fi
            ;;
        bash)
            if [ -f "$HOME/.bashrc" ]; then
                echo "$HOME/.bashrc"
            elif [ -f "$HOME/.bash_profile" ]; then
                echo "$HOME/.bash_profile"
            else
                echo "$HOME/.profile"
            fi
            ;;
        fish)
            echo "$HOME/.config/fish/config.fish"
            ;;
        *)
            echo "$HOME/.profile"
            ;;
    esac
}

# Check for AVX2 support
has_avx2() {
    if [ "$(detect_os)" = "darwin" ]; then
        sysctl -a 2>/dev/null | grep -q "hw.optional.avx2_0: 1" && return 0
    elif [ "$(detect_os)" = "linux" ]; then
        grep -q avx2 /proc/cpuinfo 2>/dev/null && return 0
    fi
    return 1
}

# Get latest release version
get_latest_version() {
    local response
    local curl_opts=(-fsSL)

    if [ -n "$GITHUB_TOKEN" ]; then
        curl_opts+=(-H "Authorization: token $GITHUB_TOKEN")
    fi

    response="$(curl "${curl_opts[@]}" "https://api.github.com/repos/$REPO/releases/latest" 2>/dev/null)" || {
        if [ -z "$GITHUB_TOKEN" ]; then
            error "Failed to fetch latest version. If this is a private repo, set GITHUB_TOKEN"
        else
            error "Failed to fetch latest version from GitHub API"
        fi
    }
    echo "$response" | grep '"tag_name":' | sed -E 's/.*"v([^"]+)".*/\1/'
}

# Build asset name
build_asset_name() {
    local os="$1"
    local arch="$2"
    local libc="$3"
    local baseline="$4"

    local name="opencode-${os}-${arch}"

    if [ "$baseline" = "1" ]; then
        name="${name}-baseline"
    elif [ "$arch" = "x64" ] && ! has_avx2; then
        info "AVX2 not detected, using baseline build"
        name="${name}-baseline"
    fi

    if [ -n "$libc" ]; then
        name="${name}-${libc}"
    fi

    if [ "$os" = "linux" ]; then
        echo "${name}.tar.gz"
    else
        echo "${name}.zip"
    fi
}

# Get download URL for asset (handles private repos via API)
get_download_url() {
    local version="$1"
    local asset_name="$2"

    if [ -n "$GITHUB_TOKEN" ]; then
        # For private repos, get asset ID from API and use API download URL
        local curl_opts=(-fsSL -H "Authorization: token $GITHUB_TOKEN")
        local release_info
        release_info="$(curl "${curl_opts[@]}" "https://api.github.com/repos/$REPO/releases/tags/v${version}" 2>/dev/null)" || {
            error "Failed to fetch release info"
        }

        # Find asset ID for our asset name
        local asset_id
        asset_id="$(echo "$release_info" | grep -B5 "\"name\": \"${asset_name}\"" | grep '"id":' | head -1 | sed -E 's/.*"id": ([0-9]+).*/\1/')"

        if [ -z "$asset_id" ]; then
            error "Asset $asset_name not found in release v${version}"
        fi

        # Return API URL for downloading the asset
        echo "https://api.github.com/repos/$REPO/releases/assets/$asset_id"
    else
        # For public repos, use direct download URL
        echo "https://github.com/$REPO/releases/download/v${version}/${asset_name}"
    fi
}

# Download and extract
download_and_extract() {
    local url="$1"
    local dest="$2"
    local os="$3"

    info "Downloading from $url"

    local tmp_dir
    tmp_dir="$(mktemp -d)"
    trap "rm -rf '$tmp_dir'" EXIT

    local archive="$tmp_dir/opencode-archive"

    # Build curl options
    local curl_opts=(-fsSL --progress-bar -o "$archive")

    if [ -n "$GITHUB_TOKEN" ]; then
        # For private repos, we need to use the API to get the actual download URL
        # and include the Accept header for the asset
        curl_opts+=(-H "Authorization: token $GITHUB_TOKEN")
        curl_opts+=(-H "Accept: application/octet-stream")
    fi

    if ! curl "${curl_opts[@]}" "$url"; then
        if [ -z "$GITHUB_TOKEN" ]; then
            error "Failed to download. If this is a private repo, set GITHUB_TOKEN"
        else
            error "Failed to download from $url"
        fi
    fi

    info "Extracting..."

    if [ "$os" = "linux" ]; then
        tar -xzf "$archive" -C "$tmp_dir"
    else
        unzip -q "$archive" -d "$tmp_dir"
    fi

    # Find the binary
    local binary
    if [ "$os" = "windows" ]; then
        binary="$(find "$tmp_dir" -name "${BINARY_NAME}.exe" -type f | head -1)"
    else
        binary="$(find "$tmp_dir" -name "$BINARY_NAME" -type f | head -1)"
    fi

    if [ -z "$binary" ]; then
        error "Binary not found in archive"
    fi

    # Create install directory if needed
    mkdir -p "$dest"

    # Install binary
    if [ "$os" = "windows" ]; then
        mv "$binary" "$dest/${BINARY_NAME}.exe"
    else
        mv "$binary" "$dest/$BINARY_NAME"
        chmod +x "$dest/$BINARY_NAME"
    fi

    success "Installed to $dest"
}

# Add directory to PATH in shell profile
add_to_path() {
    local dir="$1"
    local profile="$2"
    local shell_name
    shell_name="$(basename "${SHELL:-/bin/bash}")"

    # Check if already in PATH
    if [[ ":$PATH:" == *":$dir:"* ]]; then
        return 0
    fi

    # Check if already in profile
    if [ -f "$profile" ] && grep -q "$dir" "$profile" 2>/dev/null; then
        return 0
    fi

    if [ "$NO_MODIFY_PATH" = "1" ]; then
        return 1
    fi

    info "Adding $dir to PATH in $profile"

    # Create profile if it doesn't exist
    mkdir -p "$(dirname "$profile")"
    touch "$profile"

    # Add appropriate PATH export based on shell
    case "$shell_name" in
        fish)
            echo "" >> "$profile"
            echo "# OpenCode" >> "$profile"
            echo "fish_add_path $dir" >> "$profile"
            ;;
        *)
            echo "" >> "$profile"
            echo "# OpenCode" >> "$profile"
            echo "export PATH=\"$dir:\$PATH\"" >> "$profile"
            ;;
    esac

    success "Updated $profile"
    return 0
}

main() {
    echo ""
    echo -e "${BOLD}${CYAN}  ╔═══════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}  ║       OpenCode Installer          ║${NC}"
    echo -e "${BOLD}${CYAN}  ╚═══════════════════════════════════╝${NC}"
    echo ""

    local os arch libc
    os="$(detect_os)"
    arch="$(detect_arch)"
    libc="$(detect_libc)"

    info "Platform: $os / $arch${libc:+ / $libc}"

    # Get version
    local version="$VERSION"
    if [ "$version" = "latest" ]; then
        info "Fetching latest version..."
        version="$(get_latest_version)"
        if [ -z "$version" ]; then
            error "Could not determine latest version"
        fi
    fi

    info "Version: v$version"

    # Get install directory
    local install_dir
    install_dir="$(get_install_dir "$os")"
    info "Install directory: $install_dir"

    # Build download URL
    local asset_name
    asset_name="$(build_asset_name "$os" "$arch" "$libc" "$BASELINE")"
    local url
    url="$(get_download_url "$version" "$asset_name")"

    # Download and install
    echo ""
    download_and_extract "$url" "$install_dir" "$os"

    # Handle PATH
    local profile
    profile="$(get_shell_profile)"
    local path_updated=0

    if [[ ":$PATH:" != *":$install_dir:"* ]]; then
        if add_to_path "$install_dir" "$profile"; then
            path_updated=1
        fi
    fi

    # Verify installation
    echo ""
    local binary_path="$install_dir/$BINARY_NAME"
    [ "$os" = "windows" ] && binary_path="$install_dir/${BINARY_NAME}.exe"

    if [ -x "$binary_path" ]; then
        echo -e "${GREEN}${BOLD}Installation complete!${NC}"
        echo ""

        # Show version
        local ver_output
        ver_output="$("$binary_path" --version 2>/dev/null || echo "unknown")"
        echo -e "  ${BOLD}Version:${NC}  $ver_output"
        echo -e "  ${BOLD}Location:${NC} $binary_path"
        echo ""

        if [ "$path_updated" = "1" ]; then
            echo -e "${YELLOW}Restart your terminal or run:${NC}"
            echo ""
            echo "  source $profile"
            echo ""
        elif [[ ":$PATH:" != *":$install_dir:"* ]]; then
            warn "$install_dir is not in your PATH"
            echo ""
            echo "Add this to your shell profile ($profile):"
            echo ""
            echo "  export PATH=\"$install_dir:\$PATH\""
            echo ""
        else
            echo "Run 'opencode' to get started!"
            echo ""
        fi
    else
        error "Installation verification failed"
    fi
}

main "$@"
