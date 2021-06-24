#!/bin/sh

UQMI="timeout -t 5 -s KILL uqmi"
[ ! -f /usr/bin/timeout ] && {
	UQMI="uqmi"
}

[ -n "$INCLUDE_ONLY" ] || {
	. /lib/functions.sh
	. ../netifd-proto.sh
	init_proto "$@"
}

handle_raw_ip_mode() {
	local modem_bus ifname raw_ip

	modem_bus=$(uci get glconfig.modem.bus | sed -e 's/-/_/' -e 's/\./_/')
	ifname=$(uci -q get network.modem_${modem_bus}.ifname)
	raw_ip=$(uci -q get network.modem_${modem_bus}.raw_ip)

	if [ "$raw_ip" = "1" ]; then
		echo Y >  /sys/class/net/$ifname/qmi/raw_ip
	else
		echo N >  /sys/class/net/$ifname/qmi/raw_ip
	fi
}

handle_2G_mode() {
	local count=0
	local dev=$(echo $1|cut -d '/' -f 3)
	local dir=modem.$(find /sys/devices/platform/  -name $dev |tail -n 1|cut -d '/' -f 8|cut -d ':' -f 1)
	local mode=$(cat /tmp/$dir/signal |cut -d '"' -f 4)
	[ -f /tmp/$dir/fail_count ] && {
		count=$(cat /tmp/$dir/fail_count)
	}
	[ "$mode" = "gsm" -o "$mode" = "cdma" -o "$mode" = "tdma" ] && {
		let count=count+1
		echo $count >/tmp/$dir/fail_count
		[ $count -gt 10 ] && {
			logger modem qmi  delay dial,120s
			sleep 120
		}
		return
	}
	[ -f /tmp/$dir/fail_count ] && {
		rm /tmp/$dir/fail_count
	}
}

clean_fail_count() {
        local dev=$(echo $1|cut -d '/' -f 3)
        local dir=modem.$(find /sys/devices/platform/  -name $dev |tail -n 1|cut -d '/' -f 8|cut -d ':' -f 1)
        [ -f /tmp/$dir/fail_count ] && {    
                rm /tmp/$dir/fail_count
        } 
}

proto_qmi_init_config() {
	available=1
	no_device=1
	proto_config_add_string "device:device"
	proto_config_add_string apn
	proto_config_add_string auth
	proto_config_add_string username
	proto_config_add_string password
	proto_config_add_string pincode
	proto_config_add_int delay
	proto_config_add_string modes
	proto_config_add_string pdptype
	proto_config_add_string node
	proto_config_add_int profile
	proto_config_add_boolean dhcpv6
	proto_config_add_boolean autoconnect
	proto_config_add_int plmn
	proto_config_add_defaults
}

proto_qmi_setup() {
	local interface="$1"
	local devname=""

	local device apn auth username password pincode delay modes pdptype profile dhcpv6 autoconnect plmn node $PROTO_DEFAULT_OPTIONS
	local cid_4 pdh_4 cid_6 pdh_6
	local ip_6 ip_prefix_length gateway_6 dns1_6 dns2_6
	json_get_vars device apn auth username password pincode delay modes pdptype profile dhcpv6 autoconnect plmn node $PROTO_DEFAULT_OPTIONS
	
	#if [ -z `ps | grep qmi_watch.sh | grep -v grep` ]
	#then
	#	/usr/bin/qmi_watch.sh &
	#fi

	[ "$metric" = "" ] && metric="0"

	[ -n "$ctl_device" ] && device=$ctl_device

        [ -n "$node" ] && {
                devpath="$(find  /sys/devices/ -name "$node")"
                devname="$(find "$devpath" -name  "cdc-wdm*"|head -n 1)"
                devname=/dev/"$(basename "$devname")"
                #fix config
                [ "$devname" = "$device" ] || {
                        uci set network."$interface".device="${devname}"
                        uci commit
                        device="$devname"
                }
        }

	[ -n "$device" ] || {
		echo "No control device specified"
		proto_notify_error "$interface" NO_DEVICE
		proto_set_available "$interface" 0
		return 1
	}

	device="$(readlink -f $device)"
	[ -c "$device" ] || {
		echo "The specified control device does not exist"
		proto_notify_error "$interface" NO_DEVICE
		proto_set_available "$interface" 0
		return 1
	}

	devname="$(basename "$device")"
	devpath="$(readlink -f /sys/class/usbmisc/$devname/device/)"
	ifname="$( ls "$devpath"/net )"
	[ -n "$ifname" ] || {
		echo "The interface could not be found."
		proto_notify_error "$interface" NO_IFACE
		proto_set_available "$interface" 0
		return 1
	}

	handle_raw_ip_mode
	handle_2G_mode $device

	[ -n "$delay" ] && sleep "$delay"
	$UQMI -d "$device" --stop-network 4294967295 --autoconnect

	while $UQMI -s -d "$device" --get-pin-status | grep '"UIM uninitialized"' > /dev/null; do
		sleep 1;
	done

	[ -n "$pincode" ] && {
		$UQMI -s -d "$device" --verify-pin1 "$pincode" || {
			echo "Unable to verify PIN"
			proto_notify_error "$interface" PIN_FAILED
			proto_block_restart "$interface"
			return 1
		}
	}

	[ -n "$plmn" ] && {
		local mcc mnc
		if [ "$plmn" = 0 ]; then
			mcc=0
			mnc=0
			echo "Setting PLMN to auto"
		else
			mcc=${plmn:0:3}
			mnc=${plmn:3}
			echo "Setting PLMN to $plmn"
		fi
		$UQMI -s -d "$device" --set-plmn --mcc "$mcc" --mnc "$mnc" || {
			echo "Unable to set PLMN"
			proto_notify_error "$interface" PLMN_FAILED
			proto_block_restart "$interface"
			return 1
		}
	}

	$UQMI -s -d "$device" --set-data-format 802.3
	$UQMI -s -d "$device" --wda-set-data-format 802.3
	$UQMI -s -d "$device" --sync

	echo "Waiting for network registration"
	while $UQMI -s -d "$device" --get-serving-system | grep '"searching"' > /dev/null; do
		sleep 5;
	done

	[ -n "$modes" ] && $UQMI -s -d "$device" --set-network-modes "$modes"

	echo "Starting network $interface"

	pdptype=`echo "$pdptype" | awk '{print tolower($0)}'`
	[ "$pdptype" = "ip" -o "$pdptype" = "ipv6" -o "$pdptype" = "ipv4v6" ] || pdptype="ip"

	ipv6_enabled=`uci get glipv6.globals.enabled 2>/dev/null`
	ipv6_wan_interface=`uci get glipv6.wan.interface 2>/dev/null`
	modem_bus=`uci get glconfig.modem.bus 2>/dev/null`
	modem_bus2=`uci get glconfig.modem.bus | sed 's/-/_/g' 2>/dev/null`

	if [ "$ipv6_enabled" = "1" -a "$ipv6_wan_interface" = "modem_$modem_bus2" ];then
		pdptype="ipv4v6"
		gl_modem -B $modem_bus AT AT+CGDCONT=1,\"IPV4V6\"
	fi

	if [ "$pdptype" = "ip" ]; then
		[ -z "$autoconnect" ] && autoconnect=1
		[ "$autoconnect" = 0 ] && autoconnect=""
	else
		[ "$autoconnect" = 1 ] || autoconnect=""
	fi

	[ "$pdptype" = "ip" -o "$pdptype" = "ipv4v6" ] && {
		cid_4=`$UQMI -s -d "$device" --get-client-id wds`
		[ $? -ne 0 ] && {
			echo "Unable to obtain client ID"
			proto_notify_error "$interface" NO_CID
			return 1
		}

		$UQMI -s -d "$device" --set-client-id wds,"$cid_4" --set-ip-family ipv4 > /dev/null

		# try to clear previous autoconnect state
		$UQMI -s -d "$device" --set-client-id wds,"$cid_4" \
			--stop-network 0xffffffff \
			--autoconnect > /dev/null

		pdh_4=`$UQMI -s -d "$device" --set-client-id wds,"$cid_4" \
			--start-network \
			${apn:+--apn $apn} \
			${profile:+--profile $profile} \
			${auth:+--auth-type $auth} \
			${username:+--username $username} \
			${password:+--password $password} \
			${autoconnect:+--autoconnect}`
		[ $? -ne 0 ] && {
			echo "Unable to connect IPv4"
			$UQMI -s -d "$device" --set-client-id wds,"$cid_4" --release-client-id wds
			proto_notify_error "$interface" CALL_FAILED
			return 1
		}
	}

	[ "$pdptype" = "ipv6" -o "$pdptype" = "ipv4v6" ] && {
		cid_6=`$UQMI -s -d "$device" --get-client-id wds`
		[ $? -ne 0 ] && {
			echo "Unable to obtain client ID"
			proto_notify_error "$interface" NO_CID
			return 1
		}

		$UQMI -s -d "$device" --set-client-id wds,"$cid_6" --set-ip-family ipv6 > /dev/null

		# try to clear previous autoconnect state
		$UQMI -s -d "$device" --set-client-id wds,"$cid_6" \
			--stop-network 0xffffffff \
			--autoconnect > /dev/null

		pdh_6=`$UQMI -s -d "$device" --set-client-id wds,"$cid_6" \
			--start-network \
			${apn:+--apn $apn} \
			${profile:+--profile $profile} \
			${auth:+--auth-type $auth} \
			${username:+--username $username} \
			${password:+--password $password} \
			${autoconnect:+--autoconnect}`
		[ $? -ne 0 ] && {
			echo "Unable to connect IPv6"
			$UQMI -s -d "$device" --set-client-id wds,"$cid_6" --release-client-id wds
			proto_notify_error "$interface" CALL_FAILED
			return 1
		}
	}

	echo "Setting up $ifname"
	proto_init_update "$ifname" 1
	proto_set_keep 1
	proto_add_data
	[ -n "$pdh_4" ] && {
		json_add_string "cid_4" "$cid_4"
		json_add_string "pdh_4" "$pdh_4"
	}
	[ -n "$pdh_6" ] && {
		json_add_string "cid_6" "$cid_6"
		json_add_string "pdh_6" "$pdh_6"
	}
	proto_close_data
	proto_send_update "$interface"
	[ -n "$pdh_6" -a ! -e "/etc/init.d/gl_ipv6" ] && {
		if [ -z "$dhcpv6" -o "$dhcpv6" = 0 ]; then
			json_load "$($UQMI -s -d $device --set-client-id wds,$cid_6 --get-current-settings)"
			json_select ipv6
			json_get_var ip_6 ip
			json_get_var gateway_6 gateway
			json_get_var dns1_6 dns1
			json_get_var dns2_6 dns2
			json_get_var ip_prefix_length ip-prefix-length

			proto_init_update "$ifname" 1
			proto_set_keep 1
			proto_add_ipv6_address "$ip_6" "128"
			proto_add_ipv6_prefix "${ip_6}/${ip_prefix_length}"
			proto_add_ipv6_route "$gateway_6" "128"
			[ "$defaultroute" = 0 ] || proto_add_ipv6_route "::0" 0 "$gateway_6" "" "" "${ip_6}/${ip_prefix_length}"
			[ "$peerdns" = 0 ] || {
				proto_add_dns_server "$dns1_6"
				proto_add_dns_server "$dns2_6"
			}
			proto_send_update "$interface"
		else
			json_init
			json_add_string name "${interface}_6"
			json_add_string ifname "@$interface"
			json_add_string proto "dhcpv6"
			proto_add_dynamic_defaults
			# RFC 7278: Extend an IPv6 /64 Prefix to LAN
			json_add_string extendprefix 1
			json_close_object
			ubus call network add_dynamic "$(json_dump)"
		fi
	}

	[ -n "$pdh_4" ] && {
		json_init
		json_add_string name "${interface}_4"
		json_add_string ifname "@$interface"
		json_add_string proto "dhcp"
		proto_add_dynamic_defaults
		json_close_object
		ubus call network add_dynamic "$(json_dump)"
		clean_fail_count $device
	}
	
	if [ -n "`ps | grep qmi_watch.sh | grep -v grep`" ]                                     
	then                                                                                               
		ps | grep qmi_watch.sh | grep -v grep | awk '{print $1}' | xargs kill -9
	fi
}

qmi_wds_stop() {
	local cid="$1"
	local pdh="$2"

	[ -n "$cid" ] || return

	$UQMI -s -d "$device" --set-client-id wds,"$cid" \
		--stop-network 0xffffffff \
		--autoconnect > /dev/null

	[ -n "$pdh" ] && $UQMI -s -d "$device" --set-client-id wds,"$cid" --stop-network "$pdh"
	$UQMI -s -d "$device" --set-client-id wds,"$cid" --release-client-id wds
}

proto_qmi_teardown() {
	local interface="$1"

	local device cid_4 pdh_4 cid_6 pdh_6
	json_get_vars device

	[ -n "$ctl_device" ] && device=$ctl_device

	echo "Stopping network $interface"

	json_load "$(ubus call network.interface.$interface status)"
	json_select data
	json_get_vars cid_4 pdh_4 cid_6 pdh_6

	qmi_wds_stop "$cid_4" "$pdh_4"
	qmi_wds_stop "$cid_6" "$pdh_6"

	proto_init_update "*" 0
	proto_send_update "$interface"
}

[ -n "$INCLUDE_ONLY" ] || {
	add_protocol qmi
}
