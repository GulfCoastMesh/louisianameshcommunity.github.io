# Frequency Settings and Channels for Gulf Coast Meshcore

As we build out our network of repeaters, we've noticed significant distance by modifying frequency settings and repeater commands to help interconnect Louisiana. To connect to our backbone, switching your devices to the settings outlined below would be required.

---

As we grew so did the need the need to use a few extra commands to help keep the mesh smooth and reliable for everyone by managing the airtime and repeater identification for knowing where (y)our messages are going to or coming from.

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

~~~Optional but highly encouraged and well appreciated~~~

For those of you that are interested and able to dive a little deeper and help things along even further then go into the **repeater settings** menu, and select **Neighbors** then use the following section to apply a more specific set of delays in an effort to let each tier of repeater do its’ job before the next takes over.

The default direct.txdelay value has a 100% probability of a collision, the default txdelay value has a 12.5% probability of a collision. Using a new txdelay randomizes when repeaters transmit, directly reducing simultaneous airtime occupancy and rxdelay randomizes when repeaters listen, preventing synchronized receive windows, ACK storms, and deterministic hop-timing patterns.

Using these adaptive delays can significantly improve end-to-end DM success
in MeshCore networks by reducing collision probability, breaking deterministic timing
patterns, and improving both DM forwarding and ACK return reliability.
These settings do not correlate directly to seconds but are modifiers which add milliseconds with the benefit of increased reliability for all.

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

If everyone adopts these changes, the Mesh performance will improve.
If your neighboring repeaters do not make the change, you will not benefit, but...
If you adopt the changes, your whole community will benefit. So please encourage everyone to adopt these recommended changes.



Setting suggestions adopted from [TennMesh](https://tennmesh.com/settings/). white page info obtained from [here](https://github.com/meshcore-dev/MeshCore/discussions/2053#discussioncomment-16214117) and attempted easy to digest short form here from [Danklulz](https://discord.com/users/324403016751120386), open to suggestions and corrections.

