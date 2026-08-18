import json
import numpy as np
import pandas as pd

df_drivers = pd.read_csv("Drivers.csv")
df_vehicles = pd.read_csv("Vehicles.csv")
df_trips = pd.read_csv("Trips.csv")
df_telemetry = pd.read_csv("Telemetry.csv")

merged = df_telemetry.merge(df_trips, on="Trip_ID", how="left")

driver_stats = []
for d_id, group in merged.groupby("Driver_ID"):
    d_meta = df_drivers[df_drivers["Driver_ID"] == d_id].iloc[0]
    
    total_minutes = len(group)
    total_km = df_trips[df_trips["Driver_ID"] == d_id]["Distance_KM"].sum()
    total_km = max(total_km, 1.0)
    
    harsh_brakes = (group["Acceleration_Y"] <= -3.0).sum()
    rapid_accels = (group["Acceleration_Y"] >= 2.8).sum()
    harsh_turns = ((group["Acceleration_X"].abs() >= 3.0) | ((group["Gyro_Z"].abs() >= 40.0) & (group["Speed_KMH"] > 20))).sum()
    
    hb_rate = round(float((harsh_brakes / total_km) * 100), 2)
    ra_rate = round(float((rapid_accels / total_km) * 100), 2)
    ht_rate = round(float((harsh_turns / total_km) * 100), 2)
    
    over_50_pct = round(float((group["Speed_KMH"] > 50).mean() * 100), 1)
    over_65_pct = round(float((group["Speed_KMH"] > 65).mean() * 100), 1)
    
    d_trips = df_trips[df_trips["Driver_ID"] == d_id]
    trip_hours = pd.to_datetime(d_trips["Start_Time"]).dt.hour
    night_trips = ((trip_hours >= 22) | (trip_hours < 5)).sum()
    night_pct = round(float((night_trips / len(d_trips)) * 100), 1)
    
    speed_compliance = max(0.0, 100.0 - (over_50_pct * 0.8 + over_65_pct * 2.5))
    
    penalty = (hb_rate * 2.2) + (ra_rate * 1.8) + (ht_rate * 2.0) + ((100.0 - speed_compliance) * 0.35) + (night_pct * 0.1)
    safety_score = round(float(np.clip(100.0 - penalty, 15.0, 99.0)), 1)
    
    if safety_score >= 82:
        tier = "Safe & Exemplary"
        risk_level = "Low"
    elif safety_score >= 65:
        tier = "Moderate Risk"
        risk_level = "Medium"
    else:
        tier = "High Risk / Aggressive"
        risk_level = "High"
        
    coaching = []
    if hb_rate > 8.0:
        coaching.append("High harsh braking rate: Maintain 3-second trailing distance to reduce emergency stops.")
    if ra_rate > 8.0:
        coaching.append("Frequent aggressive acceleration: Practice progressive throttle control to conserve fuel and prevent wheel slippage.")
    if ht_rate > 6.0:
        coaching.append("Aggressive leaning & swerving in traffic: Decelerate prior to corner entry rather than braking mid-lean.")
    if over_50_pct > 25.0:
        coaching.append("Frequent urban overspeeding (>50 km/h): Regulate speed in dense delivery zones.")
    if not coaching:
        coaching.append("Exemplary driving profile: Consistently smooth throttle and braking modulation.")
        
    driver_stats.append({
        "Driver_ID": d_id,
        "Driver_Name": d_meta["Driver_Name"],
        "Age": int(d_meta["Age"]),
        "Experience_Years": int(d_meta["Experience_Years"]),
        "Primary_Zone": d_meta["Primary_Zone"],
        "Shift_Preference": d_meta["Shift_Preference"],
        "Rating": float(d_meta["Rating"]),
        "Archetype": d_meta["Archetype"],
        "Total_Trips": int(len(d_trips)),
        "Total_Distance_KM": round(float(total_km), 1),
        "Avg_Speed_KMH": round(float(group["Speed_KMH"].mean()), 1),
        "Max_Speed_KMH": round(float(group["Speed_KMH"].max()), 1),
        "Harsh_Brake_Count": int(harsh_brakes),
        "Harsh_Brake_Rate_Per_100KM": hb_rate,
        "Rapid_Accel_Count": int(rapid_accels),
        "Rapid_Accel_Rate_Per_100KM": ra_rate,
        "Harsh_Turn_Count": int(harsh_turns),
        "Harsh_Turn_Rate_Per_100KM": ht_rate,
        "Overspeed_50_Pct": over_50_pct,
        "Overspeed_65_Pct": over_65_pct,
        "Night_Trip_Pct": night_pct,
        "Safety_Score": safety_score,
        "Risk_Level": risk_level,
        "Tier": tier,
        "Coaching_Feedback": coaching
    })

vehicle_stats = []
for v_id, group in merged.groupby("Vehicle_ID"):
    v_meta = df_vehicles[df_vehicles["Vehicle_ID"] == v_id].iloc[0]
    
    total_km = df_trips[df_trips["Vehicle_ID"] == v_id]["Distance_KM"].sum()
    total_km = max(total_km, 1.0)
    
    az_diff = group["Acceleration_Z"] - 9.81
    vib_rms = round(float(np.sqrt(np.mean(az_diff ** 2))), 3)
    vib_p95 = round(float(np.percentile(np.abs(az_diff), 95)), 3)
    
    straight_mask = (group["Speed_KMH"] > 20) & (group["Acceleration_X"].abs() < 1.0)
    if straight_mask.sum() > 20:
        straight_data = group[straight_mask]
        gyro_jitter = round(float(np.std(straight_data["Gyro_X"]) + np.std(straight_data["Gyro_Y"])), 2)
    else:
        gyro_jitter = round(float(np.std(group["Gyro_X"]) + np.std(group["Gyro_Y"])), 2)
        
    brake_mask = group["Acceleration_Y"] < -1.5
    if brake_mask.sum() > 10:
        brake_judder = round(float(np.std(group.loc[brake_mask, "Acceleration_Z"])), 2)
    else:
        brake_judder = round(float(np.std(group["Acceleration_Z"])), 2)
        
    norm_vib = np.clip((vib_rms - 0.5) / 2.5, 0.0, 1.0)
    norm_jitter = np.clip((gyro_jitter - 15.0) / 35.0, 0.0, 1.0)
    norm_brake = np.clip((brake_judder - 0.6) / 2.4, 0.0, 1.0)
    norm_service = np.clip((float(v_meta["Days_Since_Last_Service"]) - 30) / 120.0, 0.0, 1.0)
    norm_odo = np.clip((float(v_meta["Odometer_KM"]) - 10000) / 50000.0, 0.0, 1.0)
    
    wear_penalty = (norm_vib * 40.0) + (norm_jitter * 25.0) + (norm_brake * 20.0) + (norm_service * 10.0) + (norm_odo * 5.0)
    health_index = round(float(np.clip(100.0 - wear_penalty, 18.0, 98.0)), 1)
    
    if health_index >= 80:
        status = "Optimal / Healthy"
        urgency = "Low"
        diagnosis = "All telemetry and vibration parameters within nominal operating bounds."
    elif health_index >= 60:
        status = "Monitor / Scheduled Service Due"
        urgency = "Medium"
        if norm_jitter > 0.4:
            diagnosis = "Mild handlebar wobble & bearing flutter detected during cruising. Check front fork alignment and tire pressure."
        else:
            diagnosis = "Normal progressive mechanical wear. Recommend standard periodic maintenance."
    else:
        status = "Critical Maintenance Required"
        urgency = "Immediate"
        if norm_vib > 0.6:
            diagnosis = "Severe vertical chassis vibration & damping degradation. Blown shock absorber / fork seal leak."
        elif norm_jitter > 0.6:
            diagnosis = "Excessive rotational jitter on straight stretches. Wheel rim distortion or worn steering stem bearings."
        elif norm_brake > 0.5:
            diagnosis = "Pulsing deceleration & brake judder. Warped brake disc rotor or uneven brake pad wear."
        else:
            diagnosis = "Cumulative sensor anomaly and chassis vibration threshold breach."
            
    vehicle_stats.append({
        "Vehicle_ID": v_id,
        "Model": v_meta["Model"],
        "Vehicle_Type": v_meta["Vehicle_Type"],
        "Capacity_CC_or_kWh": float(v_meta["Capacity_CC_or_kWh"]),
        "Manufacturing_Year": int(v_meta["Manufacturing_Year"]),
        "Odometer_KM": int(v_meta["Odometer_KM"]),
        "Days_Since_Last_Service": int(v_meta["Days_Since_Last_Service"]),
        "Total_Week_KM": round(float(total_km), 1),
        "Vibration_RMS": vib_rms,
        "Vibration_P95": vib_p95,
        "Gyro_Jitter": gyro_jitter,
        "Braking_Judder": brake_judder,
        "Health_Index": health_index,
        "Status": status,
        "Urgency": urgency,
        "Diagnosis": diagnosis
    })

fleet_summary = {
    "total_drivers": len(driver_stats),
    "total_vehicles": len(vehicle_stats),
    "total_trips": len(df_trips),
    "total_telemetry_points": len(df_telemetry),
    "total_distance_km": round(float(df_trips["Distance_KM"].sum()), 1),
    "avg_driver_safety_score": round(float(np.mean([d["Safety_Score"] for d in driver_stats])), 1),
    "avg_vehicle_health_index": round(float(np.mean([v["Health_Index"] for v in vehicle_stats])), 1),
    "safe_drivers_count": sum(1 for d in driver_stats if d["Risk_Level"] == "Low"),
    "moderate_drivers_count": sum(1 for d in driver_stats if d["Risk_Level"] == "Medium"),
    "risky_drivers_count": sum(1 for d in driver_stats if d["Risk_Level"] == "High"),
    "healthy_vehicles_count": sum(1 for v in vehicle_stats if v["Urgency"] == "Low"),
    "monitor_vehicles_count": sum(1 for v in vehicle_stats if v["Urgency"] == "Medium"),
    "critical_vehicles_count": sum(1 for v in vehicle_stats if v["Urgency"] == "Immediate")
}

sample_trips = []
for t_id in ["T001", "T046", "T106", "T226"]:
    if t_id in df_trips["Trip_ID"].values:
        t_meta = df_trips[df_trips["Trip_ID"] == t_id].iloc[0].to_dict()
        t_points = df_telemetry[df_telemetry["Trip_ID"] == t_id].to_dict(orient="records")
        sample_trips.append({
            "meta": t_meta,
            "telemetry": t_points
        })

pothole_candidates = df_telemetry[df_telemetry["Acceleration_Z"] > 14.5][["Latitude", "Longitude", "Speed_KMH", "Acceleration_Z", "Timestamp"]].head(60).to_dict(orient="records")

with open("processed_drivers.json", "w") as f:
    json.dump(driver_stats, f, indent=2)

with open("processed_vehicles.json", "w") as f:
    json.dump(vehicle_stats, f, indent=2)

with open("fleet_summary.json", "w") as f:
    json.dump(fleet_summary, f, indent=2)

with open("trips_telemetry_sample.json", "w") as f:
    json.dump(sample_trips, f, indent=2)

with open("pothole_gis_sample.json", "w") as f:
    json.dump(pothole_candidates, f, indent=2)

print("Telemetry processing complete. Exported JSON files successfully.")
