import express from "express";
import puppeteer, { Browser } from "puppeteer";

import {
  getCollectionByHandleAndSlug,
  getTrackByHandleAndSlug,
  getUserByHandle,
} from "../utils/helpers";

const router = express.Router();

// Initialize browser instance for reuse
let browser: Browser | null = null;

const getBrowser = async () => {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browser;
};

// Generate OG image for tracks
const generateTrackImage = async (handle: string, title: string) => {
  try {
    const track = await getTrackByHandleAndSlug(handle, title);
    const user = track.user;

    // Create HTML for the OG image
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${track.title} • ${user.name}</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              width: 630px;
              height: 630px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background-color: #1a1a1a;
              color: white;
              font-family: Arial, sans-serif;
            }
            h1 {
              font-size: 64px;
              font-weight: bold;
              margin: 0 0 20px 0;
              color: #a116b7;
            }
            p {
              font-size: 32px;
              margin: 0 0 20px 0;
              opacity: 0.8;
            }
            .artist {
              font-size: 24px;
              margin: 0;
              opacity: 0.6;
            }
          </style>
        </head>
        <body>
          <h1>Hello World!</h1>
          <p>Track: ${track.title}</p>
          <p class="artist">by ${user.name}</p>
        </body>
      </html>
    `;

    // Use shared browser instance and generate PNG
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 630, height: 630 });
    await page.setContent(html);

    const screenshot = await page.screenshot({
      type: "png",
      omitBackground: false,
    });

    await page.close();

    return screenshot;
  } catch (error) {
    console.error("Error generating track image:", error);
    return null;
  }
};

// Generate OG image for collections (albums/playlists)
const generateCollectionImage = async (handle: string, title: string) => {
  try {
    const collection = await getCollectionByHandleAndSlug(handle, title);

    // For now, return a redirect to the collection artwork
    return collection.artwork["1000x1000"];
  } catch (error) {
    console.error("Error generating collection image:", error);
    return null;
  }
};

// Generate OG image for users
const generateUserImage = async (handle: string) => {
  try {
    const user = await getUserByHandle(handle);
    const gateway = user.creator_node_endpoint
      ? `https://${user.creator_node_endpoint}/ipfs/`
      : "";

    const profilePicture = user.profile_picture_sizes
      ? `${gateway}${user.profile_picture_sizes}/1000x1000.jpg`
      : user.profile_picture;

    return profilePicture;
  } catch (error) {
    console.error("Error generating user image:", error);
    return null;
  }
};

// Route handlers - serve PNG OG images
router.get("/track/:handle/:title", async (req, res) => {
  try {
    const { handle, title } = req.params;
    const screenshot = await generateTrackImage(handle, title);

    if (screenshot) {
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
      res.send(screenshot);
    } else {
      res.status(404).send("Image not found");
    }
  } catch (error) {
    console.error("Error in track OG image route:", error);
    res.status(500).send("Error generating image");
  }
});

router.get("/collection/:handle/:title", async (req, res) => {
  try {
    const { handle, title } = req.params;
    const imageUrl = await generateCollectionImage(handle, title);

    if (imageUrl) {
      res.redirect(imageUrl);
    } else {
      res.status(404).send("Image not found");
    }
  } catch (error) {
    console.error("Error in collection OG image route:", error);
    res.status(500).send("Error generating image");
  }
});

router.get("/user/:handle", async (req, res) => {
  try {
    const { handle } = req.params;
    const imageUrl = await generateUserImage(handle);

    if (imageUrl) {
      res.redirect(imageUrl);
    } else {
      res.status(404).send("Image not found");
    }
  } catch (error) {
    console.error("Error in user OG image route:", error);
    res.status(500).send("Error generating image");
  }
});

router.get("/default", async (req, res) => {
  // Redirect to default Audius image
  res.redirect("https://download.audius.co/static-resources/defaultImage.jpg");
});

export { router as ogImageRouter };
