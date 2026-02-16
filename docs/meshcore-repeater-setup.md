# Setting Up a Meshcore Repeater

This guide details the steps to set up your Meshcore Repeater device.

## Step 1 – Prepare the Repeater

1.  **Connect Antenna:** Verify that an antenna is connected to your unit before continuing.
2.  **Access the WebFlash App:** Go to [https://flasher.meshcore.co.uk](https://flasher.meshcore.co.uk).
3.  **Choose Role:** Choose your device from the list and select **REPEATER**.
4.  **Connect Radio:** Connect the radio via USB.
    ![Screenshot of device role selection, highlighting Repeater](img/repeater-role.png)
5.  **Enter DFU Mode:**
    * Select **ENTER DFU MODE** (labeled #1).
    * A pop-up will ask which device; select it from the menu, hit **OK**.
    ![Screenshot of serial port connection pop-up](img/repeper-serial-connect.png)
6.  **Flash the Firmware:**
    * Once in DFU mode, select **ERASE FLASH** (labeled #2).
    * Once complete, select **FLASH** (labeled #3).
    * The pop-up will appear again; select the radio again.
    ![Screenshot of Repeater firmware flashing options, highlighting DFU mode, Erase, and Flash buttons](img/repeater-flash-options.png)

## Step 2 – First Run Configuration

1.  **Configure via USB:** After flashing is complete, click **CONFIGURE VIA USB**.
    ![Screenshot of flashing complete screen with Configure via USB button](img/repeater-config-usb.png)
2.  **Connect:** Select **CONNECT** on the pop-up window.
    ![Screenshot of Connect button for Repeater/Room server USB setup](img/repeater-connect-button.png)
3.  **Select Device:** Device Selection will pop up again; you should select your radio.
4.  **Admin Section:** Once you do so, you will be into the admin section of the radio.
    ![Screenshot of Repeater / Room server USB setup admin section](img/repeater-admin-main.png)
5.  **Make Settings Match Companion:**
    * Set the **Name** and **Location** (Latitude/Longitude).
    * Set a **Guest password** (to let someone get telemetry).
    * Set a **New Admin password** (for you to login through the phone app and make changes to your repeater).
    * **Radio settings** (Preset, Frequency, Bandwidth, etc.) must match your companion. We recommend our [frequency settings](freq-settings.md).

    ![Screenshot of Radio settings preset selection dropdown](img/repeater-preset-select.png)
    ![Screenshot of detailed Repeater Radio settings](img/repeater-radio-settings.png)
6.  **Save and Send Advert:**
    * **SAVE** the settings.
    * Scroll back up & click **SEND ADVERT**.
    ![Screenshot of Repeater admin section highlighting the Send Advert button](img/repeater-send-advert.png)
    * The repeater should now show up in your contacts on the companion phone app.

> **Note:** The CONFIGURATION WEB APP can be used when the node is connected and any changes need to be made. It can be found here:
> ![Screenshot of MeshCore Web Flasher main page showing Repeater Setup button](img/repeater-config-app.png)

## Step 3 – Verify Remote Management

1.  **Manage via Phone App:** Now you can manage your repeater through the phone app.
2.  **Access Repeater in App:**
    * Connect to the Meshcore app.
    * In contacts, click on the **ANTENNA TOWER** icon next to the repeater name.
    * **If the repeater doesn’t show up:** Click **TOOLS** > **DISCOVER NEARBY NODES** > **REPEATERS**, and it will find any within direct reach, you can add them in.
    ![Screenshot of Meshcore app Contacts screen with repeater icons circled](img/repeater-contacts-list.png)
3.  **Login to Repeater Admin:**
    * Wait for the 10-second countdown (or help support the developers), click **CONTINUE**.
    * Enter the private password you created, **LOGIN**.
    ![Screenshot of Repeater Login screen](img/repeater-login.png)
4.  **Status Page:** The Status page on loading will require the refresh. In order to minimize network usage, only what is selected to be shown is updated.
    ![Screenshot of Repeater Admin Status page](img/repeater-admin-status.png)
5.  **Send Repeater Advert via App:** To send out repeater advert, click **SETTINGS** > **ADVERT**.
    ![Screenshot of Repeater Admin Settings screen showing Advert option](img/repeater-admin-settings-advert.png)
6.  **Sync Clock (If Needed):** Some units may require a time-sync after restarts, to do this goto **SETTINGS** > **Sync Clock**.
    ![Screenshot of Repeater Admin Settings screen showing Sync Clock option](img/repeater-admin-settings-sync.png)

## Step 4 – Deploy Your Repeater!

## Acknowledgments

#### The following guide was created by Ferret from West Coast Mesh and rr from the Louisiana Mesh community. Thank you to these contributors for their work on this guide ^~^
