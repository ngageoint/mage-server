#!/usr/bin/env bash

(( $# < 1 )) && { echo "Usage: $0 [start|stop]"; exit 2; }

function starts3 {
  if [[ -n $VCAP_APPLICATION ]]; then
    [[ -z $S3_BUCKET || -z $S3_MOUNTPOINT || -z $S3_USER || -z $S3_PASS ]] && {
      echo "Deploying to CloudFoundry requires an S3 bucket to store uploads" >&2
      echo "Check your manifest for proper environment variables for:" >&2
      echo "S3_BUCKET: $S3_BUCKET" >&2
      echo "S3_MOUNTPOINT: $S3_MOUNTPOINT" >&2
      echo "S3_USER: $S3_USER" >&2
      [[ -n $S3_PASS ]] && p='****' || p='<empty>'
      echo "S3_PASS: $p" >&2
      exit 3
    }

    cat <<EOF > s3.passwd
${S3_USER}:${S3_PASS}
EOF
    chmod 600 s3.passwd

    mkdir -p $S3_MOUNTPOINT
    pgrep -lf s3fs
    if ! pgrep s3fs > /dev/null; then
      ./s3fs $S3_BUCKET $S3_MOUNTPOINT -o passwd_file=s3.passwd -o use_sse=1 || {
        echo "Unable to mount S3 filesystem" >&2
        exit 1
      }
    fi
  fi
  return 0
}

function stops3 {
  pkill s3fs
}

case "$1" in
  start)
    starts3
    ;;
  stop)
    stops3
    ;;
  *)
    echo "Unknown command: '$1'"
    exit 2
    ;;
esac

exit 0
