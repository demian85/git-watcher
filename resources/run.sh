#!/bin/bash
export MYAPP_WRAPPER="`readlink -f "$0"`"

HERE="`dirname "$MYAPP_WRAPPER"`"

# Always use our versions of ffmpeg libs.
# This also makes RPMs find the compatibly-named library symlinks.
if [[ -n "$LD_LIBRARY_PATH" ]]; then
  LD_LIBRARY_PATH="$HERE:$HERE/lib:$LD_LIBRARY_PATH"
else
  LD_LIBRARY_PATH="$HERE:$HERE/lib"
fi
export LD_LIBRARY_PATH

# Create local symlink to libudev.so.1
if [ ! -e ./libudev.so.0 ]; then
    udevDependent=`which udisks 2> /dev/null` # Ubuntu, Mint
    if [ -z "$udevDependent" ]; then
        udevDependent=`which systemd 2> /dev/null` # Fedora, SUSE
    fi
    if [ -z "$udevDependent" ]; then
        udevDependent=`which findmnt` # Arch
    fi
    udevso=`ldd $udevDependent | grep libudev.so | awk '{print $3;}'`
    if [ -e "$udevso" ]; then
       ln -sf "$udevso" ./libudev.so.0
    fi
fi

exec -a "$0" "$HERE/app"  "$@"
