# Setting Up a MeshCore Observer

This guide details the steps to set up a MeshCore Observer for the Gulf Coast Mesh network. It follows the same overall format as the companion setup guide, but uses the observer flasher and firmware hosted at [observer.gessaman.com](https://observer.gessaman.com/) instead of the standard companion flasher.

## Prerequisites

- A supported MeshCore device
- A USB data cable
- A computer running Chrome or Edge, the observer flasher uses the Web Serial API and does not support phones or Safari
- Your Wi-Fi SSID and password
- The Gulf Coast Mesh radio settings you want to apply
- A custom MQTT broker plan for your observer

## Step 1  Flash the Observer Firmware

- Open the [MeshCore Observer flasher](https://observer.gessaman.com/)
- Connect your board to your computer with a USB data cable
- Choose your device from the list
- Select the observer firmware or role you want to run:
    - Choose Repeater for most observer nodes, this is the recommended option because it forwards packets and uplinks them to your MQTT broker(s)
    - Choose Room Server only if you also want the node to host a chat room
- Leave the version on the current release unless you specifically want to test a `-dev` build
- If you are updating an existing node, leave Erase device unchecked so the node keeps its identity and settings
- If needed, click Enter DFU mode
- Click Flash! and allow serial access when your browser prompts you
- Wait for Flashing complete before disconnecting the device

## Step 2  Configure the Observer

After the first flash, configure the radio, device name, Wi-Fi, and MQTT settings. The quickest method is over USB using the built-in serial console

### Configure over USB Serial

- In the observer flasher, click Console to open the serial console
- Run commands for connectivity in the Gulf Coast Mesh

```text
# System level settings for your observer on the Gulf Coast Mesh

# These settings have been validated on a Heltec v4

set radio 910.525,62.5,7,5
set timezone America/Chicago
set path.hash.mode 1
set advert.interval 240
set flood.advert.interval 23
set tx 22
set rx 22
set name YourObserverName
set wifi.ssid YourWiFiNetwork
set wifi.pwd YourWiFiPassword
set bridge.enabled on
set radio.watchdog 60

# MQTT settings for the Gulf Coast Mesh

set mqtt.iata MSY
set mqtt.rx on
set mqtt.tx advert
set mqtt.status on
set mqtt.packets on
set mqtt.ntp time.cloudflare.com

set mqtt3.preset custom
set mqtt3.server mqtt.gulfcoastmesh.org
set mqtt3.port 8883
set mqtt3.username uplink
set mqtt3.password uplink


# Optional setting if this is a dedicated observer (preferred)

set repeat off

# Reboot to apply all settings

reboot
```

&nbsp;

## Step 3  Verify the Observer

- After the reboot, reconnect over USB if needed and confirm the node starts normally
- Verify that Wi-Fi comes up and that the observer is forwarding traffic to your MQTT destination

```text
# Useful commands to validate settings

get bridge.enabled
get mqtt.rx
get mqtt.tx
get mqtt.status
get wifi.status
```

- Once your observer successfully is sending MQTT status messages, it will be viewable on [https://analyzer.gulfcoastmesh.org/#/observers](https://analyzer.gulfcoastmesh.org/#/observers) or [https://analyzer.rg3120.net/#/observers](https://analyzer.rg3120.net/#/observers)

## Notes

- Use the Observer flasher, not the standard companion flasher used in the companion guide ([Setting up a MeshCore companion](https://www.gulfcoastmesh.org/docs/setting-up-meshcore-companion))
- The companion guide is still a good reference for the overall flow: prerequisites, flashing, configuring, and final validation ([Setting up a MeshCore companion](https://www.gulfcoastmesh.org/docs/setting-up-meshcore-companion))

## Sources

- [Setting up a MeshCore companion](https://www.gulfcoastmesh.org/docs/setting-up-meshcore-companion)
- [MeshCore flasher / observer setup guide](https://observer.gessaman.com/docs)

&nbsp;
