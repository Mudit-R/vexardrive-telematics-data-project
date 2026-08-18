let driversData = [];
let vehiclesData = [];
let fleetSummary = {};
let sampleTrips = [];
let currentDriverView = 'cards';
let currentVehicleView = 'cards';

let scoreDistChart = null;
let radarChart = null;
let scatterChart = null;
let healthPieChart = null;
let tripChart = null;
let tripImuChart = null;
let mapInstance = null;
let mapPolyline = null;
let mapMarkers = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  lucide.createIcons();
  setupNavigation();
  setupFilters();
  renderSummaryStrip();
  renderDriverDashboard();
  renderVehicleDashboard();
  setupTripExplorer();
});

async function loadData() {
  try {
    const [dRes, vRes, fRes, tRes] = await Promise.all([
      fetch('processed_drivers.json'),
      fetch('processed_vehicles.json'),
      fetch('fleet_summary.json'),
      fetch('trips_telemetry_sample.json')
    ]);
    driversData = await dRes.json();
    vehiclesData = await vRes.json();
    fleetSummary = await fRes.json();
    sampleTrips = await tRes.json();
  } catch (err) {
    console.error('Error loading data:', err);
  }
}

function setupNavigation() {
  const navItems = document.querySelectorAll('.side-nav-link');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      const targetTab = item.dataset.tab;
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      document.getElementById(targetTab).classList.add('active');

      updateHeaderTitles(targetTab);

      if (targetTab === 'trip-explorer' && mapInstance) {
        setTimeout(() => mapInstance.invalidateSize(), 200);
      }
    });
  });
}

function updateHeaderTitles(tab) {
  const title = document.getElementById('page-title');
  const sub = document.getElementById('page-subtitle');
  const breadcrumb = document.getElementById('breadcrumb-current');

  if (tab === 'driver-dashboard') {
    title.textContent = 'Driver Behaviour & Safety Dashboard';
    sub.textContent = 'Granular IMU & GPS telematics risk scoring across 30 fleet delivery riders';
    breadcrumb.textContent = 'Driver Behaviour';
  } else if (tab === 'vehicle-dashboard') {
    title.textContent = 'Vehicle Health & Diagnostics Dashboard';
    sub.textContent = 'Mechanical wear index, vibration signatures, and predictive maintenance triage';
    breadcrumb.textContent = 'Vehicle Health';
  } else if (tab === 'trip-explorer') {
    title.textContent = 'Trip Telemetry & Sensor Waveform Explorer';
    sub.textContent = 'Minute-level GPS trajectory and 3-axis accelerometer/gyroscope signal analysis';
    breadcrumb.textContent = 'Trip Telemetry';
  } else if (tab === 'strategic-usecases') {
    title.textContent = 'Strategic Applications Beyond Core Dashboards';
    sub.textContent = 'High-value business expansions: Dynamic UBI, Pothole GIS, EV Range, and ETA Engine';
    breadcrumb.textContent = 'Strategic Roadmap';
  } else if (tab === 'methodology') {
    title.textContent = 'Methodology, Scoring Formulas & Assumptions';
    sub.textContent = 'Transparent mathematical formulations, sensor calibration, and domain thresholds';
    breadcrumb.textContent = 'Methodology';
  }
}

function renderSummaryStrip() {
  const strip = document.getElementById('summary-strip');
  strip.innerHTML = `
    <div class="boron-stat-card">
      <div class="stat-content">
        <h4>Fleet Size</h4>
        <div class="stat-number">${fleetSummary.total_drivers || 30}</div>
        <div class="stat-sub">${fleetSummary.total_trips || 450} Trips Processed</div>
      </div>
      <div class="stat-icon-wrapper yellow">
        <i data-lucide="users" style="width:22px; height:22px; color:#181c32;"></i>
      </div>
    </div>

    <div class="boron-stat-card">
      <div class="stat-content">
        <h4>Avg Driver Safety</h4>
        <div class="stat-number">${fleetSummary.avg_driver_safety_score || 82.4}</div>
        <div class="stat-sub">${fleetSummary.safe_drivers_count || 19} Safe | ${fleetSummary.risky_drivers_count || 5} High Risk</div>
      </div>
      <div class="stat-icon-wrapper green">
        <i data-lucide="shield-check" style="width:22px; height:22px; color:#181c32;"></i>
      </div>
    </div>

    <div class="boron-stat-card">
      <div class="stat-content">
        <h4>Avg Vehicle Health</h4>
        <div class="stat-number">${fleetSummary.avg_vehicle_health_index || 79.1}</div>
        <div class="stat-sub">${fleetSummary.healthy_vehicles_count || 17} Healthy | ${fleetSummary.critical_vehicles_count || 6} Critical</div>
      </div>
      <div class="stat-icon-wrapper orange">
        <i data-lucide="wrench" style="width:22px; height:22px; color:#181c32;"></i>
      </div>
    </div>

    <div class="boron-stat-card">
      <div class="stat-content">
        <h4>Weekly Distance</h4>
        <div class="stat-number">${fleetSummary.total_distance_km ? fleetSummary.total_distance_km.toLocaleString() : '5,842'} km</div>
        <div class="stat-sub">${fleetSummary.total_telemetry_points ? fleetSummary.total_telemetry_points.toLocaleString() : '11,666'} IMU Pts</div>
      </div>
      <div class="stat-icon-wrapper purple">
        <i data-lucide="navigation" style="width:22px; height:22px; color:#fff;"></i>
      </div>
    </div>
  `;
  lucide.createIcons();
}

function setupFilters() {
  document.getElementById('driver-risk-filter').addEventListener('change', filterDrivers);
  document.getElementById('driver-zone-filter').addEventListener('change', filterDrivers);
  document.getElementById('vehicle-urgency-filter').addEventListener('change', filterVehicles);
  document.getElementById('vehicle-type-filter').addEventListener('change', filterVehicles);

  document.getElementById('global-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    filterDrivers(q);
    filterVehicles(q);
  });
}

function setDriverView(v) {
  currentDriverView = v;
  document.getElementById('btn-driver-cards').classList.toggle('active', v === 'cards');
  document.getElementById('btn-driver-table').classList.toggle('active', v === 'table');
  filterDrivers();
}

function setVehicleView(v) {
  currentVehicleView = v;
  document.getElementById('btn-vehicle-cards').classList.toggle('active', v === 'cards');
  document.getElementById('btn-vehicle-table').classList.toggle('active', v === 'table');
  filterVehicles();
}

function filterDrivers(searchOverride) {
  const risk = document.getElementById('driver-risk-filter').value;
  const zone = document.getElementById('driver-zone-filter').value;
  const query = typeof searchOverride === 'string' ? searchOverride : document.getElementById('global-search').value.toLowerCase();

  const filtered = driversData.filter(d => {
    const matchRisk = risk === 'all' || d.Risk_Level === risk;
    const matchZone = zone === 'all' || d.Primary_Zone === zone;
    const matchQuery = !query || d.Driver_Name.toLowerCase().includes(query) || d.Driver_ID.toLowerCase().includes(query);
    return matchRisk && matchZone && matchQuery;
  });

  document.getElementById('driver-count-badge').textContent = `${filtered.length} of ${driversData.length} Drivers`;
  renderDriversList(filtered);
}

function filterVehicles(searchOverride) {
  const urgency = document.getElementById('vehicle-urgency-filter').value;
  const vType = document.getElementById('vehicle-type-filter').value;
  const query = typeof searchOverride === 'string' ? searchOverride : document.getElementById('global-search').value.toLowerCase();

  const filtered = vehiclesData.filter(v => {
    const matchUrgency = urgency === 'all' || v.Urgency === urgency;
    const matchType = vType === 'all' || v.Vehicle_Type === vType;
    const matchQuery = !query || v.Vehicle_ID.toLowerCase().includes(query) || v.Model.toLowerCase().includes(query);
    return matchUrgency && matchType && matchQuery;
  });

  document.getElementById('vehicle-count-badge').textContent = `${filtered.length} of ${vehiclesData.length} Vehicles`;
  renderVehiclesList(filtered);
}

function renderDriverDashboard() {
  filterDrivers();
  renderDriverCharts();
}

function renderDriversList(drivers) {
  const container = document.getElementById('drivers-container');
  if (currentDriverView === 'cards') {
    container.className = 'entities-grid';
    container.innerHTML = drivers.map(d => {
      const riskClass = d.Risk_Level.toLowerCase();
      return `
        <div class="boron-entity-card" onclick="openDriverModal('${d.Driver_ID}')">
          <div class="entity-top">
            <div class="entity-name">
              <h3>${d.Driver_Name}</h3>
              <div class="entity-sub-text">${d.Driver_ID} • ${d.Primary_Zone} • ★ ${d.Rating}</div>
            </div>
            <div class="neubrutal-badge ${riskClass}">
              <span class="badge-score-val">${d.Safety_Score}</span>
              <span class="badge-score-lbl">${d.Tier.split(' ')[0]}</span>
            </div>
          </div>
          
          <div class="metrics-block">
            <div class="m-item">
              <span class="m-lbl">Harsh Brake / 100km</span>
              <span class="m-val">${d.Harsh_Brake_Rate_Per_100KM}</span>
            </div>
            <div class="m-item">
              <span class="m-lbl">Rapid Accel / 100km</span>
              <span class="m-val">${d.Rapid_Accel_Rate_Per_100KM}</span>
            </div>
            <div class="m-item">
              <span class="m-lbl">Harsh Turn / 100km</span>
              <span class="m-val">${d.Harsh_Turn_Rate_Per_100KM}</span>
            </div>
            <div class="m-item">
              <span class="m-lbl">Overspeed (>50km/h)</span>
              <span class="m-val">${d.Overspeed_50_Pct}%</span>
            </div>
          </div>

          <div class="card-action-box">
            <strong>Action:</strong> ${d.Coaching_Feedback[0]}
          </div>
        </div>
      `;
    }).join('');
  } else {
    container.className = 'boron-table-wrapper';
    container.innerHTML = `
      <table class="boron-table">
        <thead>
          <tr>
            <th>Driver Name</th>
            <th>ID</th>
            <th>Zone</th>
            <th>Trips</th>
            <th>Distance</th>
            <th>Harsh Brake/100km</th>
            <th>Rapid Accel/100km</th>
            <th>Harsh Turn/100km</th>
            <th>Overspeed %</th>
            <th>Safety Score</th>
            <th>Risk Tier</th>
          </tr>
        </thead>
        <tbody>
          ${drivers.map(d => `
            <tr onclick="openDriverModal('${d.Driver_ID}')">
              <td><strong>${d.Driver_Name}</strong></td>
              <td>${d.Driver_ID}</td>
              <td>${d.Primary_Zone}</td>
              <td>${d.Total_Trips}</td>
              <td>${d.Total_Distance_KM} km</td>
              <td>${d.Harsh_Brake_Rate_Per_100KM}</td>
              <td>${d.Rapid_Accel_Rate_Per_100KM}</td>
              <td>${d.Harsh_Turn_Rate_Per_100KM}</td>
              <td>${d.Overspeed_50_Pct}%</td>
              <td><strong>${d.Safety_Score}</strong></td>
              <td>
                <span class="side-badge ${d.Risk_Level === 'Low' ? 'badge-green' : d.Risk_Level === 'Medium' ? 'badge-orange' : 'badge-red'}">
                  ${d.Risk_Level}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

function renderDriverCharts() {
  const ctx1 = document.getElementById('driverScoreDistChart').getContext('2d');
  const safeD = driversData.filter(d => d.Risk_Level === 'Low');
  const modD = driversData.filter(d => d.Risk_Level === 'Medium');
  const riskD = driversData.filter(d => d.Risk_Level === 'High');

  scoreDistChart = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: ['Safe (≥82)', 'Moderate (65-81)', 'High Risk (<65)'],
      datasets: [{
        label: 'Driver Count',
        data: [safeD.length, modD.length, riskD.length],
        backgroundColor: ['#51cf66', '#ffd43b', '#ff6b6b'],
        borderColor: '#181c32',
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          grid: { color: '#e2e8f0' },
          ticks: { color: '#181c32', font: { weight: 'bold' } }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#181c32', font: { weight: 'bold' } }
        }
      }
    }
  });

  const ctx2 = document.getElementById('driverRadarChart').getContext('2d');
  const avg = (arr, key) => arr.reduce((acc, c) => acc + c[key], 0) / (arr.length || 1);

  radarChart = new Chart(ctx2, {
    type: 'radar',
    data: {
      labels: ['Harsh Brakes', 'Rapid Accel', 'Harsh Turns', 'Overspeed %', 'Night Exposure %'],
      datasets: [
        {
          label: 'Safe Drivers Cohort',
          data: [
            avg(safeD, 'Harsh_Brake_Rate_Per_100KM'),
            avg(safeD, 'Rapid_Accel_Rate_Per_100KM'),
            avg(safeD, 'Harsh_Turn_Rate_Per_100KM'),
            avg(safeD, 'Overspeed_50_Pct'),
            avg(safeD, 'Night_Trip_Pct')
          ],
          borderColor: '#181c32',
          backgroundColor: 'rgba(81, 207, 102, 0.4)',
          borderWidth: 2,
          pointBackgroundColor: '#51cf66'
        },
        {
          label: 'High Risk Cohort',
          data: [
            avg(riskD, 'Harsh_Brake_Rate_Per_100KM'),
            avg(riskD, 'Rapid_Accel_Rate_Per_100KM'),
            avg(riskD, 'Harsh_Turn_Rate_Per_100KM'),
            avg(riskD, 'Overspeed_50_Pct'),
            avg(riskD, 'Night_Trip_Pct')
          ],
          borderColor: '#181c32',
          backgroundColor: 'rgba(255, 107, 107, 0.45)',
          borderWidth: 2,
          pointBackgroundColor: '#ff6b6b'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#181c32', font: { weight: 'bold' } } }
      },
      scales: {
        r: {
          angleLines: { color: '#cbd5e1' },
          grid: { color: '#e2e8f0' },
          pointLabels: { color: '#181c32', font: { weight: 'bold', size: 11 } },
          ticks: { backdropColor: '#fff', color: '#64748b' }
        }
      }
    }
  });
}

function renderVehicleDashboard() {
  filterVehicles();
  renderVehicleCharts();
}

function renderVehiclesList(vehicles) {
  const container = document.getElementById('vehicles-container');
  if (currentVehicleView === 'cards') {
    container.className = 'entities-grid';
    container.innerHTML = vehicles.map(v => {
      const urgencyClass = v.Urgency === 'Immediate' ? 'high' : v.Urgency === 'Medium' ? 'medium' : 'low';
      return `
        <div class="boron-entity-card" onclick="openVehicleModal('${v.Vehicle_ID}')">
          <div class="entity-top">
            <div class="entity-name">
              <h3>${v.Model}</h3>
              <div class="entity-sub-text">${v.Vehicle_ID} • ${v.Vehicle_Type} • ${v.Odometer_KM.toLocaleString()} km</div>
            </div>
            <div class="neubrutal-badge ${urgencyClass}">
              <span class="badge-score-val">${v.Health_Index}</span>
              <span class="badge-score-lbl">${v.Urgency}</span>
            </div>
          </div>
          
          <div class="metrics-block">
            <div class="m-item">
              <span class="m-lbl">Chassis Vib RMS</span>
              <span class="m-val">${v.Vibration_RMS} m/s²</span>
            </div>
            <div class="m-item">
              <span class="m-lbl">Gyro Jitter</span>
              <span class="m-val">${v.Gyro_Jitter} °/s</span>
            </div>
            <div class="m-item">
              <span class="m-lbl">Brake Judder</span>
              <span class="m-val">${v.Braking_Judder} m/s²</span>
            </div>
            <div class="m-item">
              <span class="m-lbl">Days Since Svc</span>
              <span class="m-val">${v.Days_Since_Last_Service} d</span>
            </div>
          </div>

          <div class="card-action-box">
            <strong>Diagnosis:</strong> ${v.Diagnosis}
          </div>
        </div>
      `;
    }).join('');
  } else {
    container.className = 'boron-table-wrapper';
    container.innerHTML = `
      <table class="boron-table">
        <thead>
          <tr>
            <th>Vehicle ID</th>
            <th>Model</th>
            <th>Type</th>
            <th>Odometer</th>
            <th>Days Svc</th>
            <th>Vib RMS</th>
            <th>Gyro Jitter</th>
            <th>Brake Judder</th>
            <th>Health Index</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${vehicles.map(v => `
            <tr onclick="openVehicleModal('${v.Vehicle_ID}')">
              <td><strong>${v.Vehicle_ID}</strong></td>
              <td>${v.Model}</td>
              <td>${v.Vehicle_Type}</td>
              <td>${v.Odometer_KM.toLocaleString()} km</td>
              <td>${v.Days_Since_Last_Service}d</td>
              <td>${v.Vibration_RMS}</td>
              <td>${v.Gyro_Jitter}</td>
              <td>${v.Braking_Judder}</td>
              <td><strong>${v.Health_Index}</strong></td>
              <td>
                <span class="side-badge ${v.Urgency === 'Low' ? 'badge-green' : v.Urgency === 'Medium' ? 'badge-orange' : 'badge-red'}">
                  ${v.Urgency}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

function renderVehicleCharts() {
  const ctx1 = document.getElementById('vehicleScatterChart').getContext('2d');
  const healthy = vehiclesData.filter(v => v.Urgency === 'Low');
  const monitor = vehiclesData.filter(v => v.Urgency === 'Medium');
  const critical = vehiclesData.filter(v => v.Urgency === 'Immediate');

  scatterChart = new Chart(ctx1, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Optimal Health',
          data: healthy.map(v => ({ x: v.Vibration_RMS, y: v.Gyro_Jitter, label: `${v.Vehicle_ID} (${v.Model})` })),
          backgroundColor: '#51cf66',
          borderColor: '#181c32',
          borderWidth: 1.5,
          pointRadius: 6
        },
        {
          label: 'Monitor / Service Due',
          data: monitor.map(v => ({ x: v.Vibration_RMS, y: v.Gyro_Jitter, label: `${v.Vehicle_ID} (${v.Model})` })),
          backgroundColor: '#ffd43b',
          borderColor: '#181c32',
          borderWidth: 1.5,
          pointRadius: 7
        },
        {
          label: 'Critical Maintenance',
          data: critical.map(v => ({ x: v.Vibration_RMS, y: v.Gyro_Jitter, label: `${v.Vehicle_ID} (${v.Model})` })),
          backgroundColor: '#ff6b6b',
          borderColor: '#181c32',
          borderWidth: 1.5,
          pointRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#181c32', font: { weight: 'bold' } } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.raw.label}: Vib RMS ${ctx.raw.x} m/s², Jitter ${ctx.raw.y} °/s`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Chassis Vibration RMS (m/s²)', color: '#181c32', font: { weight: 'bold' } },
          grid: { color: '#e2e8f0' },
          ticks: { color: '#181c32' }
        },
        y: {
          title: { display: true, text: 'Rotational Gyro Jitter (°/s)', color: '#181c32', font: { weight: 'bold' } },
          grid: { color: '#e2e8f0' },
          ticks: { color: '#181c32' }
        }
      }
    }
  });

  const ctx2 = document.getElementById('vehicleHealthPieChart').getContext('2d');
  healthPieChart = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: ['Optimal Condition', 'Scheduled Service Due', 'Critical Maintenance'],
      datasets: [{
        data: [healthy.length, monitor.length, critical.length],
        backgroundColor: ['#51cf66', '#ffd43b', '#ff6b6b'],
        borderColor: '#181c32',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#181c32', font: { weight: 'bold' }, padding: 12 } }
      },
      cutout: '65%'
    }
  });
}

function setupTripExplorer() {
  const tripSelect = document.getElementById('trip-select');
  tripSelect.addEventListener('change', () => loadTripReplay(tripSelect.value));
  loadTripReplay('T001');
}

function loadTripReplay(tripId) {
  const selected = sampleTrips.find(t => t.meta.Trip_ID === tripId) || sampleTrips[0];
  if (!selected) return;

  const meta = selected.meta;
  const telemetry = selected.telemetry;

  const banner = document.getElementById('trip-meta-banner');
  banner.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1.5rem;">
      <div>
        <div style="font-size:0.75rem; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Selected Trip</div>
        <div style="font-size:1.25rem; font-weight:900; color:var(--boron-dark); font-family:'JetBrains Mono', monospace;">${meta.Trip_ID}</div>
      </div>
      <div>
        <div style="font-size:0.75rem; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Driver / Vehicle</div>
        <div style="font-size:0.95rem; font-weight:800; color:var(--boron-dark);">${meta.Driver_ID} / ${meta.Vehicle_ID}</div>
      </div>
      <div>
        <div style="font-size:0.75rem; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Mission Type</div>
        <div style="font-size:0.95rem; font-weight:800; color:var(--boron-dark);">${meta.Trip_Type.replace(/_/g, ' ')}</div>
      </div>
      <div>
        <div style="font-size:0.75rem; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Distance / Time</div>
        <div style="font-size:0.95rem; font-weight:800; color:var(--boron-dark);">${meta.Distance_KM} km / ${meta.Duration_Minutes} min</div>
      </div>
      <div>
        <div style="font-size:0.75rem; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Avg / Max Speed</div>
        <div style="font-size:0.95rem; font-weight:800; color:var(--boron-dark);">${meta.Avg_Speed_KMH} / ${meta.Max_Speed_KMH} km/h</div>
      </div>
    </div>
  `;

  if (!mapInstance) {
    mapInstance = L.map('trip-map').setView([telemetry[0].Latitude, telemetry[0].Longitude], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance);
  }

  const latlngs = telemetry.map(pt => [pt.Latitude, pt.Longitude]);
  if (mapPolyline) mapInstance.removeLayer(mapPolyline);
  mapMarkers.forEach(m => mapInstance.removeLayer(m));
  mapMarkers = [];

  mapPolyline = L.polyline(latlngs, { color: '#181c32', weight: 4, opacity: 0.9 }).addTo(mapInstance);
  mapInstance.fitBounds(mapPolyline.getBounds(), { padding: [30, 30] });

  const startIcon = L.divIcon({ className: 'custom-pin-start', html: '<div style="background:#51cf66; width:14px; height:14px; border-radius:50%; border:2px solid #181c32; box-shadow:2px 2px 0px #181c32;"></div>' });
  const endIcon = L.divIcon({ className: 'custom-pin-end', html: '<div style="background:#ff6b6b; width:14px; height:14px; border-radius:50%; border:2px solid #181c32; box-shadow:2px 2px 0px #181c32;"></div>' });

  mapMarkers.push(L.marker(latlngs[0], { icon: startIcon }).addTo(mapInstance).bindPopup('Trip Start'));
  mapMarkers.push(L.marker(latlngs[latlngs.length - 1], { icon: endIcon }).addTo(mapInstance).bindPopup('Trip End'));

  telemetry.forEach(pt => {
    if (pt.Acceleration_Y <= -3.0 || pt.Acceleration_Z > 14.0) {
      const isHarshBrake = pt.Acceleration_Y <= -3.0;
      const marker = L.circleMarker([pt.Latitude, pt.Longitude], {
        radius: 7,
        fillColor: isHarshBrake ? '#ff6b6b' : '#ffd43b',
        color: '#181c32',
        weight: 2,
        fillOpacity: 0.95
      }).addTo(mapInstance);
      marker.bindPopup(`<strong>${isHarshBrake ? 'Harsh Brake Event' : 'High Vertical Shock'}</strong><br>Min ${pt.Minute_Offset}: Speed ${pt.Speed_KMH} km/h, Ay=${pt.Acceleration_Y} m/s², Az=${pt.Acceleration_Z} m/s²`);
      mapMarkers.push(marker);
    }
  });

  renderTripTelemetryCharts(telemetry);
}

function renderTripTelemetryCharts(telemetry) {
  const labels = telemetry.map(pt => `Min ${pt.Minute_Offset}`);
  const speeds = telemetry.map(pt => pt.Speed_KMH);
  const accY = telemetry.map(pt => pt.Acceleration_Y);
  const accX = telemetry.map(pt => pt.Acceleration_X);
  const accZ = telemetry.map(pt => pt.Acceleration_Z);
  const gyroZ = telemetry.map(pt => pt.Gyro_Z);

  const ctx1 = document.getElementById('tripTelemetryChart').getContext('2d');
  if (tripChart) tripChart.destroy();

  tripChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Speed (km/h)',
          data: speeds,
          borderColor: '#181c32',
          backgroundColor: 'rgba(77, 171, 247, 0.25)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          yAxisID: 'y'
        },
        {
          label: 'Longitudinal Accel Ay (m/s²)',
          data: accY,
          borderColor: '#ff922b',
          tension: 0.3,
          borderWidth: 2,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#181c32', font: { weight: 'bold' } } }
      },
      scales: {
        x: { grid: { color: '#e2e8f0' }, ticks: { color: '#181c32' } },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: { display: true, text: 'Speed (km/h)', color: '#181c32', font: { weight: 'bold' } },
          ticks: { color: '#181c32' },
          grid: { color: '#e2e8f0' }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: { display: true, text: 'Accel Ay (m/s²)', color: '#ff922b', font: { weight: 'bold' } },
          ticks: { color: '#ff922b' },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });

  const ctx2 = document.getElementById('tripImuChart').getContext('2d');
  if (tripImuChart) tripImuChart.destroy();

  tripImuChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'Vertical Az (m/s²)', data: accZ, borderColor: '#cc5de8', borderWidth: 2, tension: 0.2 },
        { label: 'Lateral Ax (m/s²)', data: accX, borderColor: '#20c997', borderWidth: 2, tension: 0.2 },
        { label: 'Gyro Yaw Gz (°/s)', data: gyroZ, borderColor: '#ff6b6b', borderWidth: 2, tension: 0.2 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#181c32', font: { weight: 'bold' } } }
      },
      scales: {
        x: { grid: { color: '#e2e8f0' }, ticks: { color: '#181c32' } },
        y: { grid: { color: '#e2e8f0' }, ticks: { color: '#181c32' } }
      }
    }
  });
}

function openDriverModal(driverId) {
  const d = driversData.find(item => item.Driver_ID === driverId);
  if (!d) return;

  const modal = document.getElementById('detail-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  title.textContent = `Driver Profile: ${d.Driver_Name} (${d.Driver_ID})`;
  body.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
      <div>
        <div style="font-size:1.15rem; font-weight:800; color:var(--boron-dark);">${d.Driver_Name}</div>
        <div style="color:var(--text-muted); font-size:0.85rem; font-weight:600;">Age ${d.Age} • ${d.Experience_Years} Yrs Exp • ${d.Primary_Zone} Zone</div>
      </div>
      <div class="neubrutal-badge ${d.Risk_Level.toLowerCase()}">
        <span class="badge-score-val">${d.Safety_Score}</span>
        <span class="badge-score-lbl">${d.Tier}</span>
      </div>
    </div>

    <div style="font-size:0.75rem; font-weight:800; text-transform:uppercase; color:var(--boron-dark); margin-bottom:0.5rem;">
      Telematics Risk Metrics (Normalized / 100km)
    </div>
    <div class="metrics-block" style="margin-bottom:1.25rem;">
      <div class="m-item"><span class="m-lbl">Harsh Braking Rate</span><span class="m-val">${d.Harsh_Brake_Rate_Per_100KM} / 100km</span></div>
      <div class="m-item"><span class="m-lbl">Rapid Acceleration Rate</span><span class="m-val">${d.Rapid_Accel_Rate_Per_100KM} / 100km</span></div>
      <div class="m-item"><span class="m-lbl">Harsh Cornering Rate</span><span class="m-val">${d.Harsh_Turn_Rate_Per_100KM} / 100km</span></div>
      <div class="m-item"><span class="m-lbl">Overspeeding >50 km/h</span><span class="m-val">${d.Overspeed_50_Pct}% time</span></div>
      <div class="m-item"><span class="m-lbl">Overspeeding >65 km/h</span><span class="m-val">${d.Overspeed_65_Pct}% time</span></div>
      <div class="m-item"><span class="m-lbl">Night Trips Ratio</span><span class="m-val">${d.Night_Trip_Pct}%</span></div>
    </div>

    <div style="font-size:0.75rem; font-weight:800; text-transform:uppercase; color:var(--boron-dark); margin-bottom:0.5rem;">
      Targeted Driver Coaching & Safety Plan
    </div>
    <ul style="padding-left:1.25rem; font-size:0.85rem; font-weight:600; color:var(--text-muted); line-height:1.6;">
      ${d.Coaching_Feedback.map(f => `<li>${f}</li>`).join('')}
    </ul>
  `;

  modal.classList.add('active');
}

function openVehicleModal(vehicleId) {
  const v = vehiclesData.find(item => item.Vehicle_ID === vehicleId);
  if (!v) return;

  const modal = document.getElementById('detail-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  title.textContent = `Vehicle Diagnostics: ${v.Model} (${v.Vehicle_ID})`;
  body.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
      <div>
        <div style="font-size:1.15rem; font-weight:800; color:var(--boron-dark);">${v.Model}</div>
        <div style="color:var(--text-muted); font-size:0.85rem; font-weight:600;">${v.Vehicle_Type} • ${v.Manufacturing_Year} • ${v.Odometer_KM.toLocaleString()} km</div>
      </div>
      <div class="neubrutal-badge ${v.Urgency === 'Immediate' ? 'high' : v.Urgency === 'Medium' ? 'medium' : 'low'}">
        <span class="badge-score-val">${v.Health_Index}</span>
        <span class="badge-score-lbl">${v.Urgency}</span>
      </div>
    </div>

    <div style="font-size:0.75rem; font-weight:800; text-transform:uppercase; color:var(--boron-dark); margin-bottom:0.5rem;">
      Sensor Wear & Vibration Signatures
    </div>
    <div class="metrics-block" style="margin-bottom:1.25rem;">
      <div class="m-item"><span class="m-lbl">Chassis Vibration RMS</span><span class="m-val">${v.Vibration_RMS} m/s²</span></div>
      <div class="m-item"><span class="m-lbl">95th Percentile Shock</span><span class="m-val">${v.Vibration_P95} m/s²</span></div>
      <div class="m-item"><span class="m-lbl">Rotational Jitter</span><span class="m-val">${v.Gyro_Jitter} °/s</span></div>
      <div class="m-item"><span class="m-lbl">Brake Judder Dev</span><span class="m-val">${v.Braking_Judder} m/s²</span></div>
      <div class="m-item"><span class="m-lbl">Days Since Svc</span><span class="m-val">${v.Days_Since_Last_Service} days</span></div>
      <div class="m-item"><span class="m-lbl">Weekly Mileage</span><span class="m-val">${v.Total_Week_KM} km</span></div>
    </div>

    <div style="font-size:0.75rem; font-weight:800; text-transform:uppercase; color:var(--boron-dark); margin-bottom:0.5rem;">
      Mechanical Root Cause & Maintenance Trigger
    </div>
    <div style="background:#fafafa; border:2px solid #181c32; border-radius:6px; padding:0.9rem 1rem; font-size:0.85rem; font-weight:600; line-height:1.5; color:var(--boron-dark);">
      ${v.Diagnosis}
    </div>
  `;

  modal.classList.add('active');
}

function showJustificationModal() {
  const modal = document.getElementById('detail-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  title.textContent = 'Telemetry Metric Formulas & Justifications';
  body.innerHTML = `
    <div style="background:#fafafa; border:2px solid #181c32; border-radius:8px; padding:1.2rem; margin-bottom:1rem; box-shadow:3px 3px 0px #181c32;">
      <h4 style="font-size:0.95rem; font-weight:800; color:var(--boron-dark); margin-bottom:0.4rem;">Driver Safety Score (0-100)</h4>
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.5rem;">Weighted penalty model penalizing harsh driving maneuvers normalized per 100 km:</p>
      <div style="background:#fff; border:1.5px solid #181c32; padding:0.6rem 0.8rem; border-radius:4px; font-family:'JetBrains Mono', monospace; font-size:0.82rem; font-weight:700; color:var(--boron-dark); margin-bottom:0.6rem;">
        Safety Score = 100 - (2.2·HBR + 1.8·RAR + 2.0·HCR + 0.35·OverspeedPen + 0.1·NightPct)
      </div>
      <div style="font-size:0.8rem; color:var(--text-muted); line-height:1.5;">
        • <strong>HBR (Harsh Braking):</strong> ay ≤ -3.0 m/s² (Leading indicator of tailgating and crash risk)<br>
        • <strong>RAR (Rapid Accel):</strong> ay ≥ +2.8 m/s² (Indicates sudden throttle twists and tire slipping)<br>
        • <strong>HCR (Harsh Cornering):</strong> |ax| ≥ 3.0 m/s² or |gyro_z| ≥ 40°/s at speed > 20 km/h (Risk of low-side slide)
      </div>
    </div>

    <div style="background:#fafafa; border:2px solid #181c32; border-radius:8px; padding:1.2rem; box-shadow:3px 3px 0px #181c32;">
      <h4 style="font-size:0.95rem; font-weight:800; color:var(--boron-dark); margin-bottom:0.4rem;">Vehicle Health Index (0-100)</h4>
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.5rem;">Multi-sensor physical degradation index isolating mechanical sub-systems:</p>
      <div style="background:#fff; border:1.5px solid #181c32; padding:0.6rem 0.8rem; border-radius:4px; font-family:'JetBrains Mono', monospace; font-size:0.82rem; font-weight:700; color:var(--boron-dark); margin-bottom:0.6rem;">
        VHI = 100 - (40·Norm(Vib_RMS) + 25·Norm(Gyro_Jitter) + 20·Norm(Brake_Judder) + 10·Norm(Days_Svc) + 5·Norm(Odo))
      </div>
      <div style="font-size:0.8rem; color:var(--text-muted); line-height:1.5;">
        • <strong>Vibration RMS:</strong> √(1/N Σ(az - 9.81)²) isolates suspension dampening and shock leaks.<br>
        • <strong>Gyro Jitter:</strong> σ(gx)+σ(gy) during cruising isolates wheel bearing and alignment defect.<br>
        • <strong>Brake Judder:</strong> σ(az) during braking isolates warped brake discs and glazed pads.
      </div>
    </div>
  `;

  modal.classList.add('active');
}

function closeModal() {
  document.getElementById('detail-modal').classList.remove('active');
}

window.onclick = function(event) {
  const modal = document.getElementById('detail-modal');
  if (event.target === modal) closeModal();
};
