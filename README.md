# DJ Beat Tiles 🎵

A custom, browser-based DJ music player and beatboard! Upload your favorite songs, trim audio loops directly in the browser, and assign them to customizable drag-and-drop tiles to play live sets.

![DJ Beat Tiles](public/thumbnail.png) *(Preview of the UI)*

## Features ✨

- **Upload Audio**: Support for `.mp3` and `.wav` files.
- **In-Browser Audio Trimming**: Edit and trim your audio files instantly using the WebAssembly-powered FFmpeg engine and visual waveforms (`wavesurfer.js`).
- **Customizable Beat Tiles**: Add as many tiles as you want.
- **Drag & Drop Reordering**: Rearrange your beatboard layout seamlessly.
- **Zero Latency Playback**: Instant audio feedback when clicking tiles, designed for a live DJ feel.
- **Local Persistence**: Uploads and tile configurations are saved locally so your setup remains exactly as you left it.

---

## Tech Stack 🛠️

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Drag & Drop**: [@dnd-kit](https://dndkit.com/)
- **Audio Processing**: [@ffmpeg/ffmpeg](https://ffmpegwasm.netlify.app/) (WASM)
- **Audio Visualization**: [Wavesurfer.js](https://wavesurfer.xyz/)

---

## Step-by-Step Installation 🚀

Since this app uses local file storage for your uploaded audio files, it is designed to be run locally on your machine.

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18 or higher) installed on your system.

### 1. Clone the Repository
```bash
git clone https://github.com/durrayaki/beat-maker.git
cd beat-maker
```

### 2. Install Dependencies
Run the following command to install all required packages:
```bash
npm install
```

### 3. Start the Development Server
Start the Next.js local server:
```bash
npm run dev
```

### 4. Open the App
Open your browser and navigate to:
**[http://localhost:3000](http://localhost:3000)**

---

## How to Use 🎧

1. **Upload Music**: Click the `Upload Audio` button in the Library sidebar to add your `.mp3` or `.wav` files.
2. **Trim Loops**: Click the ✂️ (Scissors) icon next to any song in your library. A visual waveform will appear. Drag the purple region to select the section you want, rename the file, and click **Trim & Save**.
3. **Create Tiles**: Click the **+ Add Tile** button at the top right to add a new DJ pad.
4. **Assign Audio**: In the Library sidebar, use the dropdown menu below a song to assign it to a specific tile.
5. **Play**: Click any assigned tile to instantly play the audio loop!
6. **Reorganize**: Click and hold the `Grip` icon (six dots) on the top-left of any tile to drag and drop it anywhere on the grid.

---

## Troubleshooting FFmpeg (WebAssembly)

This project hosts the FFmpeg WebAssembly core locally in the `/public/ffmpeg` directory to bypass browser cross-origin (CORS) security restrictions regarding Web Workers. 

If audio trimming gets stuck on "Processing...", ensure:
1. You are accessing the app via `localhost` (not an IP address), as browsers restrict Web Workers on insecure network origins.
2. The `public/ffmpeg/ffmpeg-core.wasm` file downloaded correctly.

---

## License
MIT License
