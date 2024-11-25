#!/usr/bin/env bash

# Main menu using gum
choice=$(gum choose \
    "Check Status" \
    "Show Recent Logs" \
    "Manage Services" \
    "Data Operations" \
    "NATS Operations" \
    "Quit")

case $choice in
    "Check Status")
        just check
        ;;
    "Show Recent Logs")
        just show-logs
        ;;
    "Manage Services")
        service_choice=$(gum choose "Start" "Stop" "Logs" "Build")
        case $service_choice in
            "Start") just start ;;
            "Stop") just stop ;;
            "Logs") just logs ;;
            "Build") just build ;;
        esac
        ;;
    "Data Operations")
        data_choice=$(gum choose "Sync" "Snapshot" "Restore")
        case $data_choice in
            "Sync") 
                since=$(gum input --placeholder "Since date (YYYY-MM-DD)")
                just sync $since
                ;;
            "Snapshot") just snapshot ;;
            "Restore") just restore ;;
        esac
        ;;
    "NATS Operations")
        nats_choice=$(gum choose "NATS Sub" "NATS Top" "NATS Board")
        case $nats_choice in
            "NATS Sub") just nats ;;
            "NATS Top") just nats-top ;;
            "NATS Board") just natsboard ;;
        esac
        ;;
    "Quit")
        exit 0
        ;;
esac 