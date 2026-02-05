# Frequency Settings and Channels for Louisiana's Meshcore

As we build out our network of repeaters, we've noticed significant distance advantages by modifying frequency settings to help interconnect Louisiana. To connect to our backbone, we recommend switching your devices to the settings outlined below.

---

## MeshCore Network Settings

| Parameter | Setting |
| :--- | :--- |
| **Frequency** | `910.525 MHz` |
| **Bandwidth** | `62.5 kHz` |
| **Spreading Factor** | `11` |
| **Coding Rate** | `7` |

---

### How to Update Your Settings

Depending on how you access your Meshcore node, follow the instructions below to apply the new frequency parameters.

#### Bluetooth Clients (Mobile App)
If you are using the mobile app on [Android](https://play.google.com/store/apps/details?id=com.liamcottle.meshcore.android) or [iOS](https://apps.apple.com/us/app/meshcore/id6742354151): 

1. Connect to your node via **Bluetooth**.
2. Click the **Gear Icon** at the top right.
4. Scroll down to **Radio Settings**.
5. Enter the frequency `910.525` and adjust the Bandwidth, SF, and CR to match the table above.
6. Tap **Send/Save** to reboot the node with new settings.

#### Wired Clients (WebUI)
If your node is connected via USB to a computer:

1. Open the [**Meshcore Config Tool**](https://config.meshcore.dev/).
2. Go to the **Radio Config** tab.
3. Manually override the following values:
   - `frequency_offset`: Set to reach `910.525`.
   - `bandwidth`: `62`
   - `spread_factor`: `11`
   - `coding_rate`: `7`
4. Click **Apply Changes**.

---

## Meshcore Channels

#### Repeater Testing Channel

The repeater testing channel, `#repeater-testing`, is reserved for testing deployments on a channel that won't clog up public. It should not be used for conversations.

#### News Channel

This channel is reserved for news and announcements during emergencies, `#news`, A bot will automatically publish to this channel and discousions can be had here releated to the current situation.

### How to add a channel

#### Bluetooth Clients (Mobile App)
If you are using the mobile app on [Android](https://play.google.com/store/apps/details?id=com.liamcottle.meshcore.android) or [iOS](https://apps.apple.com/us/app/meshcore/id6742354151): 

1. Connect to your node via **Bluetooth**.
2. Click the **Three Dots** at the top right.
4. Tap **Add Channel**.
5. Click the button that says **Join a Hashtag Channel**.
6. Type in the tag of the channel you want to join.
7. Click **Join Channel**.