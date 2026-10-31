#!/bin/bash

# Put this script to your Termux device and run to send notifications

# Configuration (Replace with your actual Deno server IP)
SERVER_URL="http://localhost:8001/abc/notify"
SLEEP_INTERVAL=2

# Global tracking array
declare -A SEEN_KEYS

# --- Helper Functions ---
log_verbose() {
    local stage="$1"
    local message="$2"
    echo "[$(date +'%Y-%m-%dT%H:%M:%S')]" "[$stage]" "$message"
}

send_payload() {
    local payload="$1"
    local timeout="$2"
    # Returns HTTP status code
    curl -X POST \
        -H "Content-Type: application/json" \
        -d "$payload" \
        "$SERVER_URL" \
        --max-time "$timeout" \
        -s -w "%{http_code}" \
        -o /dev/null
}

# --- Core Logic Functions ---
# Stage 1: Gather and sync existing notifications
sync_existing_notifications() {
    log_verbose "STAGE_1" "Fetching current active Android notifications..."
    local raw_list
    raw_list=$(termux-notification-list 2>/dev/null)
    
    if [ -z "$raw_list" ] || [ "$raw_list" = "[]" ]; then
        log_verbose "STAGE_1" "No active notifications found or API error."
        return 0
    fi
    
    local count
    count=$(echo "$raw_list" | jq '. | length')
    log_verbose "STAGE_1" "Found $count active notification(s). Filtering payload..."
    
    # Изменено: Собираем "key" вместо "id" для заполнения индекса отслеживания
    while read -r key; do
        if [ -n "$key" ] && [ "$key" != "null" ]; then
            SEEN_KEYS["$key"]=1
        fi
    done < <(echo "$raw_list" | jq -r '.[].key' 2>/dev/null)
    
    log_verbose "STAGE_2" "Tracking index populated with existing KEYs."
    # Prepare and send batch
    local current_notifs
    current_notifs=$(echo "$raw_list" | jq '[.[] | {key: .key, title: .title, content: .content, packageName: .packageName, when: .when}]' 2>/dev/null)
    
    log_verbose "STAGE_1" "Sending batch payload to Deno server..."
    local http_status
    http_status=$(send_payload "$current_notifs" 5)
    if [ "$http_status" = "200" ]; then
        log_verbose "STAGE_1" "Successfully synchronized initial batch (HTTP 200)."
    else
        log_verbose "STAGE_1" "Warning: Server responded with HTTP status $http_status during initialization."
    fi
}

# Stage 2: Process a single notification line from the loop
process_notification_item() {
    local item="$1"
    if [ -z "$item" ] || [ "$item" = "null" ]; then
        return 0
    fi
    
    # Изменено: Извлекаем "key" вместо "id"
    local key pkg
    {
        read -r key
        read -r pkg
    } < <(echo "$item" | jq -r '"\(.key)\n\(.packageName)"' 2>/dev/null)
    
    # Check if notif unique
    if [ -z "${SEEN_KEYS[$key]}" ]; then
        SEEN_KEYS["$key"]=1
        log_verbose "EVENT_DETECTED" "New notification captured from application: $pkg"
        log_verbose "API_DISPATCH" "Forwarding new event payload to server..."
        
        local http_status
        http_status=$(send_payload "$item" 3)
        if [ "$http_status" = "200" ]; then
            log_verbose "API_SUCCESS" "Server acknowledged event receipt (HTTP 200: OK)."
        else
            log_verbose "API_FAILURE" "Failed to forward event. Server responded with HTTP status: $http_status"
        fi
    fi
}

# Real-time monitoring loop
monitor_notifications() {
    log_verbose "STAGE_2" "Initializing real-time monitoring engine..."
    log_verbose "STAGE_2" "Monitoring loop engaged (Interval: ${SLEEP_INTERVAL}s)."
    
    while true; do
        local loop_raw
        loop_raw=$(termux-notification-list 2>/dev/null)
        
        if [ -n "$loop_raw" ] && [ "$loop_raw" != "[]" ]; then
            local active_keys
            # Extract active keys like string with separator
            active_keys=","$(echo "$loop_raw" | jq -r '.[].key' | paste -sd, -)","
            
            # Removing SEEN_IDS that we already don't have
            for tracked_key in "${!SEEN_KEYS[@]}"; do
                if [[ ! "$active_keys" == *",$tracked_key,"* ]]; then
                    unset "SEEN_KEYS[$tracked_key]"
                fi
            done
            
            while read -r item; do
                process_notification_item "$item"
            done < <(echo "$loop_raw" | jq -c '.[]' 2>/dev/null)
        else
            # if we don't have notifications, clean
            SEEN_KEYS=()
        fi
        
        sleep "$SLEEP_INTERVAL"
    done
}

# --- Script Execution ---
log_verbose "INIT" "Starting script execution..."
log_verbose "INIT" "Target Server URL set to: $SERVER_URL"

sync_existing_notifications
monitor_notifications
