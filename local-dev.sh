case $1 in
    stop-watch )
        echo "stopping builds running with watch..."
        watchPIDS=""
        watchPIDS=$(ps aux | grep -- '--watch' | grep -v grep | awk '{print $2}')
        echo "found pids with watch: {$watchPIDS}"
        if [ -z "$watchPIDS" ]; then
            echo "No watch processes were found."
        else
            echo "Killing PIDs: $watchPIDS"
            kill $watchPIDS
            echo "watch builds have been stopped."
        fi
esac

