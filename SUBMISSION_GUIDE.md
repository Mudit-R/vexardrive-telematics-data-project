# VexarDrive Technologies — Submission Guide & Form Answers

This document provides exact, copy-paste ready answers and preparation steps for completing the Google Form submission at:
👉 **[https://forms.gle/qsaiteGEi9qDNQVS7](https://forms.gle/qsaiteGEi9qDNQVS7)**

---

### 1. Form Field-by-Field Answers

| Form Field | Recommended Submission Input | Notes |
| :--- | :--- | :--- |
| **Email** | `mudit14127@gmail.com` | Google Account email |
| **Name** | `Mudit R` | Your full name |
| **Mobile No.** | `+91 XXXXXXXXXX` | Your contact number |
| **Official Mail Id** | `mudit14127@gmail.com` | Official communication email |
| **Wellfound Profile link** | `https://wellfound.com/u/mudit-rungta` *(or your profile URL)* | Add your Wellfound URL |
| **Resume** | Upload `Mudit_Rungta.pdf` (available in your local files) | PDF upload under 10MB |
| **GitHub repository Link** | `https://github.com/Mudit-R/vexardrive-telematics-data-project` | Push the repository to GitHub |
| **Drive Link (Technical Report & Images)** | `https://drive.google.com/drive/folders/<your-shared-folder-link>?usp=sharing` | See Drive Setup section below |
| **Dashboard Link (If hosted)** | `https://mudit-r.github.io/vexardrive-telematics-data-project/` | Free hosting via GitHub Pages |
| **Mention the AI tools used (if any)** | *See AI Tools Justification text below* | Ready-to-copy response |
| **When would you be able to join?** | `Immediately` *(or within 1 week / as required)* | Your joining availability |
| **Expected stipend (Per month)** | `₹25,000 - ₹35,000 / month` *(or as per your expectation)* | Standard market range |
| **Willing to accept PPO?** | `Yes` *(or Depends on the offer terms)* | Select radio button |
| **Declaration** | `I confirm that this submission is my own original work and I have complied with assessment guidelines.` | Checkbox |

---

### 2. AI Tools Usage Statement (Copy & Paste)

> *"AI tools (LLM coding assistants) were utilized as an accelerator for exploratory data analysis structuring, boilerplate UI scaffolding, and validating edge-case mathematical formulations (e.g. tri-axial IMU gravity compensation and rotation transformations). All underlying telematics scoring algorithms, feature engineering logic, domain threshold calibrations (harsh braking, chassis vibration RMS, gyroscopic jitter), and business case expansions were rigorously developed, verified, and tailored specifically to two-wheeler physical dynamics."*

---

### 3. Google Drive Preparation Checklist

Create a public Google Drive folder with view permissions (`Anyone with the link can view`) containing:
1. `Technical_Report.pdf` (or `Technical_Report.md` exported to PDF)
2. `Dashboard_Images/` (Folder containing screenshots of both dashboards):
   - `01_Driver_Behaviour_Dashboard.png`
   - `02_Driver_Profile_Modal.png`
   - `03_Vehicle_Health_Dashboard.png`
   - `04_Vehicle_Diagnostic_Modal.png`
   - `05_Trip_Telemetry_Map_Waveforms.png`
   - `06_Strategic_Future_UseCases.png`
   - `07_Methodology_Formulations.png`
3. `Source_Code.zip` (Optional zip of the repo)

---

### 4. Hosting on GitHub Pages in 2 Minutes

To get a live public dashboard link for free:
1. Initialize git in this folder:
   ```bash
   git init
   git add .
   git commit -m "Complete VexarDrive telematics platform and analytics suite"
   ```
2. Create a public repository on GitHub called `vexardrive-telematics-analytics`.
3. Push your code:
   ```bash
   git remote add origin https://github.com/<your-username>/vexardrive-telematics-analytics.git
   git branch -M main
   git push -u origin main
   ```
4. On GitHub, go to **Settings > Pages > Branch: `main` / `root` > Save**.
5. Your live link will be: `https://<your-username>.github.io/vexardrive-telematics-analytics/`
