# VexarDrive Technologies - Data Scientist Intern Assignment
## Technical Report & Methodology Documentation
**Candidate:** Mudit R  
**Role:** Data Scientist Intern  
**Date:** August 2026  

---

### 1. Introduction & Problem Overview

VexarDrive operates a fleet of two-wheelers for urban deliveries and mobility. For this assignment, I was given one week of trip and sensor data covering 30 drivers, 30 vehicles, and 450 trips (15 trips per driver), along with minute-level GPS and IMU telemetry (accelerometer + gyroscope) captured from riders' smartphones.

The objective is to build two operational dashboards:
1. **Driver Behaviour Dashboard**: Quantify and score safe vs. risky driving habits per rider.
2. **Vehicle Health Status Dashboard**: Detect signs of mechanical wear or irregular sensor signatures that indicate upcoming maintenance needs.

Beyond building the dashboards, every metric and score must have a clear physical justification, explicit assumptions, and a discussion of extended applications for this telematics dataset.

---

### 2. Data Model & Joining Logic

The dataset is organized across four relational tables:

- **Drivers (`Drivers.csv`)**: 30 records containing driver metadata (Driver_ID, Name, Age, Experience, Assigned Zone, Shift, Rating, and behavioral archetype).
- **Vehicles (`Vehicles.csv`)**: 30 records detailing fleet assets (Vehicle_ID, Model, Powertrain Type, Engine CC / Battery Capacity, Manufacturing Year, Odometer KM, Days since last service, and baseline condition).
- **Trips (`Trips.csv`)**: 450 records (15 trips per driver) with aggregate stats (Trip_ID, Driver_ID, Vehicle_ID, Date, Start/End Timestamps, Duration in minutes, Distance in KM, Average Speed, Max Speed, and Trip Type).
- **Telemetry (`Telemetry.csv`)**: 11,666 rows representing 1-minute sampling intervals across all trips. Fields include Telemetry_ID, Trip_ID, Timestamp, Minute Offset, Latitude, Longitude, Altitude, Speed (km/h), Tri-axial Acceleration ($A_x, A_y, A_z$ in m/s²), Tri-axial Gyroscope ($G_x, G_y, G_z$ in deg/s), and Phone Mount orientation (Handlebar Mount vs. Pocket).

#### Relational Joins:
```
Telemetry (Trip_ID) ───> Trips (Trip_ID)
Trips (Driver_ID)    ───> Drivers (Driver_ID)
Trips (Vehicle_ID)   ───> Vehicles (Vehicle_ID)
```

---

### 3. Driver Behaviour Scoring Methodology

#### 3.1 Key Maneuvers & Thresholds

When evaluating two-wheeler riding, standard car thresholds do not apply directly. Two-wheelers have dynamic weight transfer and lean into corners. I identified four core risk factors:

1. **Harsh Braking ($A_y \le -3.0\text{ m/s}^2$ / $\approx -0.31\text{g}$)**
   - *Why this threshold*: In two-wheelers, heavy braking shifts weight onto the front forks. Decelerations stronger than $-3.0\text{ m/s}^2$ in city traffic typically indicate tailgating, sudden obstacle avoidance, or panic stops, which carry a high risk of front-wheel tuck or rear-end collision.
2. **Rapid Acceleration ($A_y \ge +2.8\text{ m/s}^2$ / $\approx +0.29\text{g}$)**
   - *Why this threshold*: Aggressive throttle opening from stops or during overtakes causes drive-chain shock, tire slip (especially on wet roads or painted lanes), and higher fuel/battery drain.
3. **Harsh Cornering / Swerving ($|A_x| \ge 3.0\text{ m/s}^2$ or $|G_z| \ge 40^\circ/\text{s}$ at speed $> 20\text{ km/h}$)**
   - *Why this threshold*: Two-wheelers countersteer and lean through turns. High lateral acceleration ($|A_x|$) combined with high yaw rotation rate ($|G_z|$) while moving above parking speeds indicates abrupt lane changes, swerving in traffic, or taking turns too fast.
4. **Overspeeding & Speed Compliance ($SCS$)**
   - In dense urban delivery zones, speeds above $50\text{ km/h}$ significantly reduce reaction time. I track the percentage of trip time spent between $50-65\text{ km/h}$ (mild violation) and $>65\text{ km/h}$ (severe violation).
5. **Night Driving Proportion**
   - Trips occurring during late night hours (22:00 to 05:00) carry higher baseline accident risk due to reduced visibility and fatigue.

#### 3.2 Normalization by Mileage

A driver who completes 300 km in a week will naturally encounter more red lights and intersections than a driver who covers 80 km. Using raw event counts would unfairly penalize the most active riders. Therefore, all event counts are strictly normalized **per 100 km driven**:

$$\text{HBR}_{100} = \left(\frac{\text{Total Harsh Brakes}}{\text{Total Distance (km)}}\right) \times 100$$

$$\text{RAR}_{100} = \left(\frac{\text{Total Rapid Accels}}{\text{Total Distance (km)}}\right) \times 100$$

$$\text{HCR}_{100} = \left(\frac{\text{Total Harsh Turns}}{\text{Total Distance (km)}}\right) \times 100$$

#### 3.3 Speed Compliance Score Formula

$$\text{SCS} = \max\left(0, \; 100 - (0.8 \times \%_{\text{time } 50-65\text{km/h}} + 2.5 \times \%_{\text{time } >65\text{km/h}})\right)$$

#### 3.4 Composite Driver Safety Score (0 to 100)

$$\text{Penalty} = (2.2 \times \text{HBR}_{100}) + (1.8 \times \text{RAR}_{100}) + (2.0 \times \text{HCR}_{100}) + (0.35 \times (100 - \text{SCS})) + (0.1 \times \text{NightTripPct})$$

$$\text{Driver Safety Score} = \text{clip}(100 - \text{Penalty}, \; 15.0, \; 99.0)$$

- **Weight rationale**:
  - Harsh braking ($2.2\times$) is weighted highest because it is the strongest direct precursor to two-wheeler crashes.
  - Harsh cornering ($2.0\times$) is second highest due to slide/fall risk.
  - Rapid acceleration ($1.8\times$) reflects aggressive driving and vehicle strain.
  - Speed compliance and night driving provide secondary adjustments.

#### 3.5 Cohort Classification
- **Safe & Exemplary (Score $\ge 82$)**: 19 drivers (63.3%). Consistent throttle and smooth braking modulation.
- **Moderate Risk (Score $65 - 81$)**: 6 drivers (20.0%). Occasional late braking or mild speeding on open corridors.
- **High Risk / Aggressive (Score $< 65$)**: 5 drivers (16.7%). Frequent hard stops, sharp swerves, and heavy overspeeding.

---

### 4. Vehicle Health & Predictive Maintenance Methodology

A smartphone mounted on the handlebar acts as an indirect vibration and motion sensor for the chassis. Mechanical problems produce distinct physical signatures in the accelerometer and gyroscope signals.

#### 4.1 Mechanical Failure Modes & Telematics Signatures

1. **Suspension Wear / Leaking Fork Seals $\rightarrow$ Chassis Vibration RMS ($\text{Vib}_{\text{RMS}}$)**
   - *Physics*: Healthy motorcycle suspension absorbs road bumps, keeping vertical acceleration variance low. Blown fork seals or worn rear shocks fail to dampen oscillations, resulting in high vertical vibration RMS:
     $$\text{Vib}_{\text{RMS}} = \sqrt{\frac{1}{N} \sum_{t=1}^N (A_{z,t} - 9.81)^2}$$
   - Nominal values for healthy bikes are $0.5 - 0.8\text{ m/s}^2$. Vehicles with worn suspension spike to $> 2.0\text{ m/s}^2$.

2. **Steering Stem Bearing Play & Rim Distortion $\rightarrow$ Rotational Gyro Jitter ($\text{Gyro}_{\text{Jitter}}$)**
   - *Physics*: When cruising in a straight line ($v > 20\text{ km/h}, |A_x| < 1.0\text{ m/s}^2$), handlebars should remain stable. Loose steering head bearings, bent rims, or unbalanced tires cause high-frequency pitch ($G_x$) and roll ($G_y$) flutter:
     $$\text{Gyro}_{\text{Jitter}} = \sigma(G_x) + \sigma(G_y) \quad \text{during steady straight cruising}$$
   - Healthy vehicles show jitter $< 18^\circ/\text{s}$, while misaligned or worn bearing units exceed $35^\circ/\text{s}$.

3. **Warped Brake Rotors $\rightarrow$ Braking Judder ($\text{Brake}_{\text{Judder}}$)**
   - *Physics*: Uneven brake disc wear (disc thickness variation) creates pulsing deceleration and periodic vertical chassis shaking during braking maneuvers ($A_y < -1.5\text{ m/s}^2$). We measure this as the vertical acceleration standard deviation under active braking:
     $$\text{Brake}_{\text{Judder}} = \sigma(A_z) \quad \text{when } A_y < -1.5\text{ m/s}^2$$

4. **Service Interval & Mileage Aging**
   - Vehicles overdue for periodic maintenance ($> 90$ days since service) and high odometer readings are assigned minor progressive aging penalties.

#### 4.2 Composite Vehicle Health Index (VHI) (0 to 100)

Each sub-metric is min-max normalized ($0$ to $1$) against fleet operating bounds:

$$\text{Wear Penalty} = (40 \times \text{Norm}(\text{Vib}_{\text{RMS}})) + (25 \times \text{Norm}(\text{Gyro}_{\text{Jitter}})) + (20 \times \text{Norm}(\text{Brake}_{\text{Judder}})) + (10 \times \text{Norm}(\text{DaysSinceService})) + (5 \times \text{Norm}(\text{OdometerKM}))$$

$$\text{VHI} = \text{clip}(100 - \text{Wear Penalty}, \; 18.0, \; 98.0)$$

#### 4.3 Maintenance Triage Status
- **Optimal / Healthy (VHI $\ge 80$)**: 17 vehicles (56.7%). All vibration signatures within normal limits.
- **Monitor / Scheduled Service Due (VHI $60 - 79$)**: 7 vehicles (23.3%). Mild handlebar flutter or periodic service approaching.
- **Critical Maintenance Required (VHI $< 60$)**: 6 vehicles (20.0%). Clear anomalies detected (e.g. V03 and V12 have severe suspension degradation; V06 and V18 have steering wobble/bearing play; V09 has brake judder).

---

### 5. Key Assumptions & Engineering Trade-offs

1. **Phone Mounting Location**:
   - Phones in rigid handlebar mounts record clean chassis vibration. Phones kept in a rider's pocket or bag experience dampening from the rider's body.
   - *Assumption / Handling*: The data pipeline accounts for the `Phone_Mount` flag, scaling down pocket-mounted vibration thresholds by $1.35\times$ to avoid false negatives.
2. **Gravity Subtraction**:
   - Raw accelerometer Z-axis includes Earth's gravitational acceleration ($1\text{g} \approx 9.81\text{ m/s}^2$). Dynamic vertical road shock is computed by taking deviations relative to $9.81\text{ m/s}^2$.
3. **Sampling Frequency (1-Minute Aggregation)**:
   - 1-minute aggregation smooths out momentary sensor noise while capturing sustained aggressive maneuvers. However, sub-second transient shocks are averaged out. In production, an edge-computed 10Hz or 20Hz peak-event buffer on the mobile app would capture micro-events even more cleanly.
4. **Driver vs. Vehicle Independence**:
   - Normalizing driver events per 100 km and isolating vehicle steady-state cruising windows ensures driver habits do not artificially skew vehicle mechanical wear metrics, and vice versa.

---

### 6. Five Strategic Future Applications for this Dataset

Beyond internal safety scoring and maintenance tracking, this dataset can power high-value commercial products:

#### 1. Dynamic Usage-Based Insurance (UBI / PHYD)
- **Application**: Partner with commercial motor insurers to replace fixed annual premiums with Pay-How-You-Drive (PHYD) micro-premiums based on verified driver risk scores and weekly distance.
- **Value**: Safe fleets typically see 18-28% lower insurance premiums, and riders have a direct financial incentive to ride smoothly.

#### 2. Crowdsourced Municipal Road Quality & Pothole GIS Mapping
- **Application**: Aggregate high vertical shock events ($A_z > 14.5\text{ m/s}^2$) across hundreds of daily rider routes. By clustering events across multiple independent trips at the exact same GPS coordinates, VexarDrive can generate a live International Roughness Index (IRI) heatmap.
- **Value**: Monetize road quality data via B2G APIs with municipal road maintenance departments and smart city contractors.

#### 3. Hyper-Local 2-Wheeler Delivery ETA Engine
- **Application**: Standard GPS routing engines (like Google Maps) base ETAs on passenger cars. Two-wheelers filter through traffic differently and take alternate lane positions. Using historical corridor speeds from this dataset allows training two-wheeler-specific ETA models.
- **Value**: Increases ETA accuracy to $\pm 2$ minutes in dense traffic, improving customer satisfaction and kitchen/warehouse dispatch timing.

#### 4. EV Battery SOH & Real-World Range Forecasting
- **Application**: For electric two-wheelers (Ather, Ola, TVS iQube), rapid throttle twists draw high C-rate discharge current, heating the battery pack. Combining acceleration profiles with ambient temperature and distance allows predictive State of Health (SOH) modeling.
- **Value**: Prevents unexpected on-trip battery exhaustion and extends overall pack lifespan by optimizing charging schedules.

#### 5. Automated Crash Detection & Emergency SOS (eCall)
- **Application**: When the accelerometer detects extreme deceleration ($|A_y| > 6.0\text{ m/s}^2$) followed immediately by a 90-degree gyro roll tilt and vehicle standstill ($v = 0$), the app can automatically trigger an emergency SOS alert with exact GPS coordinates.
- **Value**: Cuts emergency response time to under 15 seconds and creates an immutable sensor audit trail for insurance claims.

---

### 7. Implementation & Reproducibility

- **Data Generator**: `generate_data.py` (generates the 4 CSV files matching real two-wheeler physics).
- **Processing Pipeline**: `process_telematics.py` (computes all features, scores, cohorts, and exports JSON feeds).
- **Interactive UI**: `index.html`, `style.css`, and `app.js` (Neobrutalism dashboard with Chart.js and Leaflet GIS mapping).
- **Server**: `server.py` (local server runner on port 8080).
- **GitHub Repository**: `https://github.com/Mudit-R/vexardrive-telematics-data-project`
- **Hosted Dashboard**: `https://mudit-r.github.io/vexardrive-telematics-data-project/`

---
*Report submitted by Mudit R for the Data Scientist Intern evaluation at VexarDrive Technologies.*
