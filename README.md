# Spin & Win: weekly pledge draw

A live name wheel with a mystery gift box. Everyone who opens the link sees the same spin at the same moment. When the wheel stops, the box opens and shows the winner's prize.

- `index.html` is the page you share in the WhatsApp groups.
- `admin.html` is the fundraising team's screen. You add paid names, type the week's prize and press spin.

The pages are plain HTML, CSS and JavaScript. Firebase (free plan) stores the names and the spin result.

## Try it first (no setup)

While `js/config.js` has no Firebase details, the pages run in **demo mode**: the data stays in your own browser. To try it:

1. Put the folder on GitHub Pages (step 6 below), or run `python3 -m http.server` in this folder and go to `http://localhost:8000`.
2. Open `admin.html` in one tab and `index.html` in another.
3. Add a few names and a prize, then press **Spin now** and switch to the viewer tab.

Opening the files by double-clicking them won't work, because browsers block this kind of script on `file://` pages.

## Set up Firebase (about 10 minutes, once)

1. **Create the project.** Go to <https://console.firebase.google.com>, click **Add project**, give it a name (for example `spin-box`) and finish. Google Analytics isn't needed.
2. **Create the database.** Go to **Build → Realtime Database → Create database**, pick the location closest to most members, and choose **Start in locked mode**. Open the **Rules** tab, replace everything with the contents of `database.rules.json`, then click **Publish**.
3. **Create the team login.** Go to **Build → Authentication → Get started → Email/Password**, then **Enable** and **Save**. On the **Users** tab, click **Add user** and enter the team's email and a strong password. Copy that user's **User UID**.
4. **Make that login an admin.** Go back to **Realtime Database → Data**. Hover over the top line, click **+**, and add a key `admins` (no value). Under it, add the UID you copied as the key, with the value `true`. Repeat for any other team member who should run the draw.
5. **Connect the pages.** Go to **Project settings** (gear icon) → **Your apps** → **Web** (`</>`), register an app, and copy the `firebaseConfig` values into `js/config.js`. Make sure `databaseURL` is filled in. If it's missing, copy the address shown at the top of the Realtime Database page.
6. **Publish on GitHub Pages.** Push this folder to a GitHub repository. Then go to **Settings → Pages → Deploy from a branch → main / (root)** and click **Save**. Your links will be:
   - Viewer: `https://<your-username>.github.io/<repo-name>/`
   - Admin: `https://<your-username>.github.io/<repo-name>/admin.html`
7. **Allow your site to sign in.** In Firebase, go to **Authentication → Settings → Authorized domains → Add domain** and add `<your-username>.github.io`.

The Firebase values in `config.js` aren't secret. Every web app that uses Firebase exposes them. What keeps the draw safe is the database rules: anyone can watch, but only the accounts listed under `admins` can change names, prizes or spins.

## Every Sunday

1. Before the service, open the admin page, add any newly paid names, and type this week's prize. Viewers can't see the prize until the box opens.
2. Share the viewer link in the groups, for example: "The draw is live after the service, open this link to watch."
3. When it's time, press **Spin now**. Everyone with the page open gets a short countdown, then watches the wheel spin and the box open.
4. The winner stays on screen until you press **Back to waiting screen**. Every draw is saved under **Past winners**.

Names stay on the wheel after winning. To give someone an extra chance, add their name again.

## Changing things

- Title, subtitle, draw-time text, spin length and countdown are in `js/config.js`.
- Colours are at the top of `css/style.css`, and the wheel colours are at the top of `js/wheel.js`.
- For WhatsApp link previews, change the `og:image` line in `index.html` to the full address of `og-image.png` on your site.
