# Frequency Settings for Gulf Coast Meshcore

As we build out our network of repeaters, we've noticed significant distance by modifying frequency settings and repeater commands to help interconnect Louisiana. To connect to our backbone, switching your devices to the settings outlined below would be required.

---

As we grew so did the need the need to use a few extra commands to help keep the mesh smooth and reliable for everyone by managing the airtime and repeater identification for knowing where (y)our messages are going to or coming from.

--- 

## Settings and repeater commands.

| Parameter | Setting |
| :--- | :--- |
| **Frequency** | `910.525 MHz` |
| **Bandwidth** | `62.5 kHz` |
| **Spreading Factor** | `7` |
| **Coding Rate** | `5` or `8` |
| **Connection Type** | 5 (strong) / 8 (weak)

### Region Codes:

| Region | Code |
| :--- | :--- |
| PNS | `gc-fl-pns-mm` |
| LFT | `gc-la-lft-mm` |
| MSY | `gc-la-msy-mm` |
| GPT | `gc-ms-gpt-mm`

Please configure your repeater to block mesh-mapper region codes from adjacent areas, and only allow the region code your within; this prevents network congestion and ensures only your local region's code is active on your device.
| **Connection Type** | `5` (strong) / `8` (weak) ||

---

If you are setting up a repeater(thank you), please enter these commands below by logging into it and selecting **Command Line** at the bottom center to help the reliability of the Mesh for yourself and all of us.

**`set path.hash.mode 1`**   
**`set agc.reset.interval 4`**   
**`set multi.acks 1`**    

each will return an **OK** reply when successful, just try again for the odd occasion it does fail.   

Please set your Advert intervals to **Zero Hop - 240** and **Flood - 23**

These enable 2byte IDs to avoid network confusion, smooth out reception between strong and weak incoming signals, and an extra receipt to be sent between each repeater to help each be sure its' job is complete. The delays are minimal, we promise.
