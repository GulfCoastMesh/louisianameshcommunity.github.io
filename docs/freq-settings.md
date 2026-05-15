# Frequency Settings for Gulf Coast Meshcore

As we build out our network of repeaters, we've noticed significant distance by modifying frequency settings and repeater commands to help interconnect Louisiana. To connect to our backbone, switching your devices to the settings outlined below would be required.

---

As we grew so did the need the need to use a few extra commands to help keep the mesh smooth and reliable for everyone by managing the airtime and repeater identification for knowing where (y)our messages are going to or coming from.

--- 

## Settings and repeater commands.

| Parameter | Recommended USA/Canada |
| :--- | :--- |
| **Frequency** | `910.525 MHz` |
| **Bandwidth** | `62.5 kHz` |
| **Spreading Factor** | `9` |
| **Coding Rate** | `5` or `8` |
| **Connection Type** | 5 (strong) / 8 (weak) ||

---

If you are setting up a repeater(thank you), please enter these commands below by logging into it and selecting **Command Line** at the bottom center to help the reliability of the Mesh for yourself and all of us.

**`set path.hash.mode 1`**   
**`set agc.reset.interval 4`**   
**`set multi.acks 1`**   
**`set txdelay 0.3`**   
**`set rxdelay 3`**   
each will return an **OK** reply when successful, just try again for the odd occasion it does fail.   

These enable 2byte IDs to avoid network confusion, smooth out reception between strong and weak incoming signals, and an extra receipt to be sent between each repeater to help each be sure its' job is complete. The delays are minimal, we promise.

**~~~Optional but highly encouraged and well appreciated~~~**

For those of you that are interested and able to dive a little deeper and help things along even further then go into the **repeater settings** menu, and select **Neighbors**then use the following section to apply a more specific set of delays in an effort to let each tier of repeater do its’ job before the next takes over.

| Neighbor Count | `txdelay` | `direct.txdelay` | Command's |
| :--- | :--- | :--- | :--- |
| **0–1** | `0.3` | `0.1` | <details><summary>Show Commands</summary>```set txdelay 0.3``` and ```set direct.txdelay 0.1```</details> |
| **2–4** | `0.5` | `0.3` | <details><summary>Show Commands</summary>```set txdelay 0.5``` and ```set direct.txdelay 0.3```</details> |
| **5–9** | `1.0` | `0.5` | <details><summary>Show Commands</summary>```set txdelay 1``` and ```set direct.txdelay 0.5```</details> |
| **10–14** | `1.5` | `1.0` | <details><summary>Show Commands</summary>```set txdelay 1.5``` and ```set direct.txdelay 1.0```</details> |
| **15+** | `2.0` | `2.0` | <details><summary>Show Commands</summary>```set txdelay 2.0``` and ```set direct.txdelay 2.0t```</details> |



White page info obtained from [here](https://github.com/meshcore-dev/MeshCore/discussions/2053#discussioncomment-16214117) and attempted easy to digest short form here from [Danklulz](https://discord.com/users/324403016751120386), open to suggestions and corrections.

