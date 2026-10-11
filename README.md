# CivicPin: Powering Smart Infrastructure Through Community Demand

## 📌 Overview
CivicPin is a crowdsourced demand-mapping platform that empowers communities to influence infrastructure development. Users can pin locations where essential services are needed, upvote demands, and help businesses and policymakers make data-driven decisions.

## 🚀 Features
- **Community-Driven Demand Mapping** – Users can pin locations and upvote service requests (e.g., hospitals, ATMs, banks, canteens).
- **AI-Powered Insights** – Uses Google Gemini API to analyze market competition, demand trends, and feasibility.
- **Real-Time Analytics** – Provides businesses and policymakers with up-to-date demand data.
- **Property Marketplace** – Property owners can list spaces, and businesses can discover high-demand locations.
- **Interactive Map** – Uses Google Maps API for visualization of demand hotspots and property listings.
- **User Engagement** – Users can comment on demands and share requests within their network.

## 🛠️ Tech Stack
- **Framework:** Django 5.2 (Python 3.12)
- **API:** Django REST Framework
- **Database:** SQLite by default, PostgreSQL in production
- **Cache:** in-process by default, Redis for multi-worker deployments
- **Frontend:** Django templates + Tailwind, with Three.js for the 3D scenes
- **AI Integration:** Google Gemini API (server-side)
- **Mapping:** Google Maps JavaScript API

The whole application — API and pages — is one Django project at
[`Code/civicpin_django`](Code/civicpin_django). See its
[README](Code/civicpin_django/README.md) for the API reference and the full
configuration list.

## 📥 Installation & Setup

1. **Clone the repository and enter the project:**
   ```sh
   git clone https://github.com/yourusername/civicpin.git
   cd civicpin/Code/civicpin_django
   ```

2. **Create a virtual environment and install the dependencies:**
   ```sh
   python -m venv .venv
   .venv\Scripts\activate          # Windows
   # source .venv/bin/activate     # macOS / Linux
   pip install -r requirements.txt
   ```

3. **Configure the environment.** Copy `.env.example` to `.env` and fill in
   whichever keys you have:
   ```
   DJANGO_SECRET_KEY=<a long random string>
   GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
   GEMINI_API_KEY=<your-google-gemini-api-key>
   GOOGLE_CLIENT_ID=<your-google-oauth-client-id>   # optional
   RESEND_API_KEY=<your-resend-key>                 # optional
   ```
   Every key is optional in development: the maps, Google Sign-In and AI
   panels disable themselves cleanly when their key is missing, and signup
   accepts the fixed OTP `123456` when no email service is configured.

4. **Set up the database and start the server:**
   ```sh
   python manage.py migrate
   python manage.py seed_demo_data    # optional sample content
   python manage.py runserver
   ```

   The app runs at <http://localhost:8000>. `seed_demo_data` prints the demo
   sign-in details.

5. **Create an admin account** for <http://localhost:8000/admin/>:
   ```sh
   python manage.py createsuperuser
   ```

### Docker

```sh
docker compose up --build
```

Runs the app on port 8000 with PostgreSQL and Redis behind it.

### Tests

```sh
python manage.py test
```

## ⚙️ How It Works
1. Users log in and pin locations where they need essential services.
2. Other users can upvote or comment on existing demands.
3. Google Gemini API analyzes the data to provide insights on demand hotspots and business feasibility.
4. Property owners list available spaces for businesses to explore.
5. Businesses and policymakers access real-time analytics to make informed decisions.

## 🌍 Future Enhancements
- **Radius-Based Demand Selection** – Let users define an area instead of a pinpoint location.
- **Enhanced AI Analysis** – Optimize Google Gemini API for more precise insights.
- **Business & Property Recommendations** – Match businesses with high-demand areas.
- **UI/UX Improvements** – Improve interface for a smoother user experience.
- **Scalability & Security** – Ensure a robust and secure infrastructure.

## 👥 Author
- **Kalyan Chilamkuri**

## 🎥 Demo & Screenshots
- [Screenshots](https://drive.google.com/drive/folders/1U-NyO2vEY45Ps-9mBNcHgH2Rj7egfcXX)
- [Live Demo](#) *(Coming Soon)*

---
_This project is proprietary and not open-source. Unauthorized distribution or reproduction is prohibited._
