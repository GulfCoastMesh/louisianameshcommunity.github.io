# Frequency Settings and Channels for Gulf Coast MeshCore

As we build out our network of repeaters, we've noticed significant distance by modifying frequency settings and repeater commands to help interconnect Louisiana. To connect to our backbone, switching your devices to the settings outlined below would be required.

---

## Settings and repeater commands.

| Parameter | Setting |
| :--- | :--- |
| **Recommended USA/Canada**|
| **Frequency** | `910.525 MHz` |
| **Bandwidth** | `62.5 kHz` |
| **Spreading Factor** | `9` |
| **Coding Rate** | `5 or 8` |
| (5 for strong 8 for weak connection) |

---

If you are setting up a repeater(thank you), please enter these commands below by logging into it and selecting **Command Line** at the bottom center to help the reliability of the Mesh for yourself and all of us.

**set path.hash.mode 1**   
**set agc.reset.interval 4**   
**set multi.acks 1**   
**set txdelay 0.3**   
**set rxdelay 3**   
each will return an **OK** reply when successful, just try again for the odd occasion it does fail.   

These enable 2byte IDs to avoid network confusion, smooth out reception between strong and weak incoming signals, and an extra receipt to be sent between each repeater to help each be sure its' job is complete. The delays are minimal, we promise.

**~~~Optional but highly encouraged and well appreciated~~~**

For those of you that are interested and able to dive a little deeper and help things along even further then go into the **repeater settings** menu, and select **Neighbors**then use the following section to apply a more specific set of delays in an effort to let each tier of repeater do its’ job before the next takes over.

Neighbor Count: 0–1   
set txdelay 0.3   
set direct.txdelay 0.1     

Neighbor Count: 2–4   
set txdelay 0.5   
set direct.txdelay 0.3   

Neighbor Count: 5–9   
set txdelay 1   
set direct.txdelay 0.5   

Neighbor Count: 10–14   
set txdelay 1.5   
set direct.txdelay 1   

Neighbor Count: 15+   
set txdelay 2   
set direct.txdelay 2   

---

White page info obtained from [here](https://github.com/meshcore-dev/MeshCore/discussions/2053#discussioncomment-16214117) and attempted easy to digest short form here from [Danklulz](https://discord.com/users/324403016751120386), open to suggestions and corrections.

