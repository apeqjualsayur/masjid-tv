# Masjid TV — Pilot Setup Guide

**For:** the AJK member setting up the prayer-time screen.
**Time needed:** about 45 minutes for a Google TV, 30 minutes for a laptop.
**You need:** the TV or laptop, the masjid WiFi name and password, and this page.

**Screen address (write it exactly):**

```
https://masjidview.my/tv/
```

Choose **one** setup:

- **Part A — Google TV** (a smart TV with Google TV, or a Google TV streaming stick). Recommended for daily use.
- **Part B — Windows laptop** connected to a TV by HDMI. Good for the first trial.

> Menu names differ a little between TV brands and software versions. If a step says "look for", choose the closest name you see.

---

## Before you start

1. Connect the TV or laptop to the **masjid WiFi**. Use the network that is on all day (not a phone hotspot).
2. Make sure the **date and time** are correct and the **time zone is Kuala Lumpur (GMT+8)**. The screen corrects small clock errors itself, but a wrong time zone confuses it.
3. Choose a **PIN** (4–6 digits) for the screen settings, and a **password** for remote control (Part A). Keep them in the AJK records, **not** on a sticker on the TV.

---

## Part A — Google TV with Fully Kiosk Browser

Fully Kiosk Browser shows one web page full screen, starts it when the TV is switched on, and stops people from leaving it.

> **About the licence:** Fully Kiosk is free to try. **Kiosk lock** and **Remote Administration** need a **Fully Plus licence** (a small one-time payment per TV, bought on fully-kiosk.com). Without it, those features show a watermark. You can finish the setup first and buy the licence after the trial.

### A1. Allow apps from outside the Play Store

1. Press **Home** on the remote. Go to **Settings** (gear icon, top right) → **System** → **About**.
2. Scroll to **Android TV OS build** (or **Build**). Press **OK** on it **7 times**, until it says *"You are now a developer"*.
3. Press **Back** twice. Go to **Settings** → **Apps** → **Security & restrictions** → **Unknown sources**. Leave this screen open; you come back in step A2.5.

### A2. Install "Downloader", then Fully Kiosk

1. Press **Home**. Open **Search** (or the **Apps** tab) and search **Downloader**. Install **Downloader by AFTVnews** (orange icon).
2. Open **Downloader**. Allow it to access files if asked.
3. In the address box, type: `fully-kiosk.com` and press **Go**.
4. On the website, open **Download**, choose the latest **Fully Kiosk Browser APK** (the Android version) and download it.
5. If Android blocks the install, go back to **Settings → Apps → Security & restrictions → Unknown sources** and turn **Downloader** on. Then return to Downloader and press **Install** again.
6. When installed, press **Open**. (Downloader may offer to delete the APK file: choose **Delete**, it is no longer needed.)

### A3. Set the screen address

1. Fully Kiosk opens with a welcome page. Allow the permissions it asks for (it needs them to start on boot and keep the screen on).
2. Open Fully's **Settings**: on most remotes press **Back**, or swipe from the left edge on a touch screen, then choose **Settings**.
3. **Web Content Settings** → **Start URL** → type:
   `https://masjidview.my/tv/`
   Press **OK**.
4. Go back to the main page (press **Back** until you leave Settings). The prayer-time screen should appear. Wait 30 seconds for it to load the first time.

### A4. Start automatically when the TV is switched on

1. Fully **Settings** → **Device Management** → turn on **Launch on Boot** (may be called **Start on Boot**).
2. Same page: turn on **Keep Screen On**.
3. If Android asks to make Fully the default **Home app**, choose **Fully Kiosk Browser** and **Always**.

### A5. Stop the screen from sleeping or showing photos

The TV must never turn off its screen or show the Google photo screensaver.

1. Press **Home** → **Settings** → **System** → **Ambient mode** (or **Screen saver**) → set **Start ambient mode / When to start** to **Never** (or the longest time available).
2. **Settings** → **System** → **Power & energy** (or **Energy saver**) → set **Turn off display / When inactive** to **Never**.
3. Check the **TV brand's own** power menu as well (often under **Settings → Display / Picture → Power** or **Eco**). Turn **off** anything like **Sleep timer**, **Auto power off**, **Idle TV standby**, **No signal power off**, or **Eco mode turn off after 4 hours**.
4. In Fully **Settings** → **Screensaver** (or **Screen Saver / Screen Off**): make sure Fully's own screensaver is **off**.

### A6. Reload by itself if something goes wrong

The screen already reloads itself every night at **03:00** and recovers from errors after 30 seconds. Also turn on Fully's safety nets:

1. Fully **Settings** → **Web Auto Reload** → turn on **Auto Reload after Page Error** and **Reload on Network Reconnect**.
2. Leave **Auto Reload on Idle** **off**. The screen updates itself; extra reloads can interrupt the iqamah countdown.

### A7. Full screen and lock (Fully Plus)

1. Fully **Settings** → **Toolbars & Appearance** (or **Fullscreen**) → turn on **Fullscreen Mode** / hide the status and navigation bars.
2. Fully **Settings** → **Kiosk Mode** → turn on **Enable Kiosk Mode** → set the **Kiosk Exit PIN** (the PIN you chose).
3. To change settings later: press **Back** or tap the screen corner as Fully shows, then enter the PIN.

### A8. Remote control from a phone (Fully Plus)

This lets an AJK member check or reload the screen from a phone on the masjid WiFi.

1. Fully **Settings** → **Remote Administration** → turn on **Enable Remote Administration**.
2. Set **Remote Admin Password** (the password you chose).
3. Note the **IP address** shown there (looks like `192.168.1.25`).
4. On a phone connected to the **same WiFi**, open a browser and go to `http://<IP address>:2323` (for example `http://192.168.1.25:2323`). Enter the password.
5. From there you can **Reload Start URL**, see a screenshot, or restart the app.

### A9. Final check (Google TV)

- [ ] Switch the TV **off at the wall**, wait 10 seconds, switch on. The prayer screen comes back by itself within 2 minutes.
- [ ] The clock matches a phone clock (within a few seconds).
- [ ] The prayer times match the JAKIM e-Solat website for the masjid's zone.
- [ ] Leave it for 30 minutes without touching the remote: the screen stays on, no photos or screensaver.
- [ ] Remote control works from a phone (if you set it up).

---

## Part B — Windows laptop with Chrome kiosk mode

### B1. Install Chrome and check the screen

1. Install **Google Chrome** from `google.com/chrome` if it is not already there.
2. Connect the laptop to the TV with an **HDMI** cable. Press **Windows key + P** and choose **Second screen only** (the TV shows the picture, the laptop screen goes dark). Choose **Duplicate** instead if you want to see it on both.
3. Right-click the desktop → **Display settings**: set the TV's resolution to **1920 × 1080** if available.
4. Keep the laptop **plugged in to power** at all times.

### B2. Create the "Masjid TV" shortcut

1. Right-click an empty part of the desktop → **New** → **Shortcut**.
2. In the box, paste **exactly** (one line):

   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk "https://masjidview.my/tv/" --user-data-dir="C:\MasjidTV\chrome" --no-first-run --noerrdialogs --hide-crash-restore-bubble --disable-features=Translate --overscroll-history-navigation=0
   ```

   > If Chrome is installed somewhere else, right-click your normal Chrome icon → **Properties** and copy the path from **Target**.

3. Click **Next**, name it **Masjid TV**, click **Finish**.
4. Double-click **Masjid TV**. The prayer screen opens full screen.
   - To close it: press **Alt + F4**.
   - The `--user-data-dir` part gives the screen its own Chrome profile, so it works even if someone also uses normal Chrome on the laptop.

### B3. Start automatically

1. Press **Windows key + R**, type `shell:startup`, press **Enter**. A folder opens.
2. Copy the **Masjid TV** shortcut from the desktop into that folder.
3. **Sign in automatically** (so a power cut does not leave the laptop at the password screen):
   1. **Settings** → **Accounts** → **Sign-in options**: turn **off** *"For improved security, only allow Windows Hello sign-in…"*.
   2. Press **Windows key + R**, type `netplwiz`, press **Enter**.
   3. Untick **"Users must enter a user name and password to use this computer"** → **Apply** → enter the password twice → **OK**.

   > Use a laptop that is only for the masjid screen. Automatic sign-in means anyone who opens it gets in.

4. **Start after a power cut** (optional, only some laptops): in the laptop's BIOS/UEFI settings look for **Restore on AC power loss / Power on AC**. If you are not sure, skip this; switch the laptop on manually after a power cut.

### B4. Never sleep, never turn off the screen

1. **Settings** → **System** → **Power & battery** (or **Power**) → **Screen and sleep**: set every **"When plugged in…"** option to **Never**.
2. **Control Panel** → **Power Options** → **Choose what closing the lid does** → **When I close the lid: Plugged in → Do nothing** → **Save changes**. (Then you can close the lid while the TV shows the screen.)
3. **Settings** → **Personalization** → **Lock screen** → **Screen saver** → **(None)** → **OK**.

### B5. No pop-ups on the screen

1. **Settings** → **System** → **Notifications**: turn **Notifications** **off**, and turn **Do not disturb** **on**.
2. **Settings** → **Windows Update** → **Advanced options** → **Active hours**: set **Manually**, from **4:00 AM** to **11:00 PM**. Windows will then only restart for updates at night.
3. Uninstall or turn off auto-start for apps that show pop-ups (antivirus offers, "Update available" messages). **Task Manager** (**Ctrl + Shift + Esc**) → **Startup apps** → **Disable** anything not needed.
4. Move the mouse pointer to the bottom-right corner so it is out of the way.

### B6. Final check (laptop)

- [ ] **Restart** the laptop (Start → Power → Restart). It signs in and opens the prayer screen by itself.
- [ ] No "Restore pages?" or "Translate this page?" bubbles appear.
- [ ] The clock matches a phone, and the times match JAKIM e-Solat.
- [ ] Leave it 30 minutes: the screen stays on, no notifications appear.

---

## Checking the screen (both setups)

Add `?debug=1` to the address to see a status bar at the bottom:
`https://masjidview.my/tv/?debug=1`

| Line | What you want to see |
|---|---|
| **Sumber data** | `live` (fetched today) or `cache` (saved earlier). `fallback` is still correct times, from the yearly file. `tiada` = no data, call the maintainer |
| **Data sync** | A time today or yesterday |
| **Jam sync** | Recent. An **orange dot** means the clock has not checked the internet for over 24 hours |
| **Service worker** | `aktif` = the screen will keep working without internet |

**Remember to change the address back** (remove `?debug=1`) when you finish.

---

## Troubleshooting

| Problem | What to do |
|---|---|
| Screen goes **black at night** or after a few hours | A sleep setting is still on. Check A5 (all four steps, especially the TV brand's own **Auto power off / Idle standby**) or B4. |
| **Google photos / clock screensaver** appears | Google TV **Ambient mode** is still on (A5.1), or Fully's own screensaver (A5.4). |
| Downloader says it **cannot install** the app | Turn on **Unknown sources** for Downloader (A1.3, A2.5). |
| After switching on, the TV shows the **home screen**, not the prayer screen | Turn on **Launch on Boot** (A4.1). On some TVs, also choose Fully as the **Home app** (A4.3). Laptop: check the shortcut is in the `shell:startup` folder (B3). |
| Laptop opens Chrome **with tabs and an address bar**, not full screen | The shortcut is missing `--kiosk`, or the text was not pasted exactly. Delete it and create it again (B2). |
| **"Restore pages?"** bubble on the laptop | Make sure the shortcut includes `--hide-crash-restore-bubble`. Always close the screen with **Alt + F4**, not by unplugging. |
| Fully shows a **watermark** or "PLUS feature" message | Kiosk Mode or Remote Admin needs the Fully Plus licence (see Part A note). Buy it, or turn those two features off. |
| Can't **leave** the screen to change settings | Google TV: use the **Kiosk Exit PIN**. Laptop: press **Alt + F4**. |
| Phone can't open **Remote Admin** | The phone must be on the **same WiFi** as the TV. Check the IP address in Fully (it can change after a router restart) and add `:2323`. |
| **Times are wrong** | Check the TV's **time zone** is Kuala Lumpur. If the times are for the wrong area, the masjid's JAKIM **zone** is set wrong in the screen settings: tell the maintainer. |
| Clock is a few minutes off | It corrects itself when online. If it stays wrong, check the TV's date/time is **automatic** and the WiFi works. |
| **"Data waktu tidak tersedia"** | The screen has no prayer data for today. Connect to the internet and wait 5 minutes. If it stays, tell the maintainer (the yearly data may need updating). |
| Screen shows an **old version** after a change | It updates at the next nightly reload (03:00). To update now: Google TV — Fully menu or Remote Admin → **Reload Start URL**; laptop — press **F5**, or **Alt + F4** and open Masjid TV again. |
| **"Ralat paparan"** message | The screen recovers by itself after 30 seconds. If it keeps coming back, take a photo and tell the maintainer. |
| WiFi was down for a day | Normal. The screen keeps showing correct times from its saved data (status `cache` or `fallback`). |

---

## Setup record (keep with the AJK files)

| Item | Value |
|---|---|
| Masjid / surau | |
| Setup type | ☐ Google TV  ☐ Laptop |
| TV brand / model | |
| WiFi network name | |
| TV IP address (Remote Admin) | |
| Fully Plus licence bought? | ☐ Yes  ☐ No |
| Kiosk PIN / Remote password stored with | |
| Set up by / date | |
| Final check passed (A9 or B6) | ☐ Yes, date: |