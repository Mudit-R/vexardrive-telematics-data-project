import numpy as np
import pandas as pd
from datetime import datetime, timedelta

np.random.seed(42)

driver_names = [
    "Aarav Sharma", "Rohan Verma", "Vikram Malhotra", "Aditya Patel", "Suresh Kumar",
    "Karan Singh", "Deepak Gupta", "Rahul Nair", "Manoj Joshi", "Anand Rao",
    "Pooja Mehta", "Kunal Shah", "Rajesh Yadav", "Amit Choudhury", "Praveen Tiwari",
    "Naveen Reddy", "Sanjay Mishra", "Harish Pillai", "Arjun Bhatia", "Vikas Dubey",
    "Gaurav Saxena", "Nitin Das", "Sunil Kulkarni", "Mohit Pandey", "Ravi Shankar",
    "Pradeep Soni", "Ashok Sen", "Tarun Roy", "Manish Jain", "Chetan Deshmukh"
]

vehicle_models = [
    ("Honda Activa 6G", "ICE Scooter", 110),
    ("TVS Jupiter 125", "ICE Scooter", 125),
    ("Bajaj Pulsar 150", "ICE Motorcycle", 150),
    ("Hero Splendor Plus", "ICE Motorcycle", 100),
    ("Ather 450X", "Electric Scooter", 3.7),
    ("TVS iQube", "Electric Scooter", 3.0),
    ("Honda Shine 125", "ICE Motorcycle", 125),
    ("Suzuki Access 125", "ICE Scooter", 125),
    ("Ola S1 Pro", "Electric Scooter", 4.0),
    ("Bajaj Chetak", "Electric Scooter", 3.2)
]

zones = ["Central", "North", "South", "East", "West"]
shifts = ["Morning", "Afternoon", "Evening", "Night"]

driver_profiles = []
for i in range(30):
    d_id = f"D{i+1:02d}"
    name = driver_names[i]
    age = int(np.random.randint(22, 48))
    exp = int(np.clip(age - 20 - np.random.randint(0, 5), 1, 15))
    zone = np.random.choice(zones)
    shift = np.random.choice(shifts, p=[0.35, 0.30, 0.25, 0.10])
    base_rating = round(float(np.random.uniform(4.2, 4.95)), 2)
    if i in [3, 7, 14, 21, 28]:
        archetype = "Aggressive"
        base_rating = round(float(np.random.uniform(3.7, 4.3)), 2)
    elif i in [1, 9, 18, 25]:
        archetype = "Distracted_Erratic"
        base_rating = round(float(np.random.uniform(3.9, 4.4)), 2)
    else:
        archetype = "Safe_Smooth"
    
    driver_profiles.append({
        "Driver_ID": d_id,
        "Driver_Name": name,
        "Age": age,
        "Experience_Years": exp,
        "Primary_Zone": zone,
        "Shift_Preference": shift,
        "Rating": base_rating,
        "Total_Trips_Completed": 15,
        "Archetype": archetype
    })

df_drivers = pd.DataFrame(driver_profiles)

vehicle_profiles = []
for i in range(30):
    v_id = f"V{i+1:02d}"
    model_idx = i % len(vehicle_models)
    model, v_type, cap = vehicle_models[model_idx]
    year = int(np.random.choice([2019, 2020, 2021, 2022, 2023, 2024], p=[0.1, 0.15, 0.25, 0.25, 0.15, 0.1]))
    odo = int(np.random.uniform(12000, 58000))
    days_since_service = int(np.random.randint(15, 160))
    
    if i in [2, 11, 22]:
        wear_condition = "Suspension_Wear"
    elif i in [5, 17, 27]:
        wear_condition = "Bearing_Misalignment"
    elif i in [8, 19]:
        wear_condition = "Brake_Warp"
    else:
        wear_condition = "Normal"
        
    vehicle_profiles.append({
        "Vehicle_ID": v_id,
        "Model": model,
        "Vehicle_Type": v_type,
        "Capacity_CC_or_kWh": cap,
        "Manufacturing_Year": year,
        "Odometer_KM": odo,
        "Days_Since_Last_Service": days_since_service,
        "Wear_Condition": wear_condition
    })

df_vehicles = pd.DataFrame(vehicle_profiles)

trip_records = []
telemetry_records = []

start_base_date = datetime(2026, 8, 10, 8, 0, 0)
trip_counter = 1
telemetry_counter = 1

zone_lat_lon = {
    "Central": (12.9716, 77.5946),
    "North": (13.0358, 77.5970),
    "South": (12.9141, 77.6109),
    "East": (12.9784, 77.6408),
    "West": (12.9900, 77.5300)
}

trip_types = ["Food_Delivery", "Quick_Commerce", "Parcel_Delivery", "On_Demand_Rider"]

for d_idx, d_row in df_drivers.iterrows():
    d_id = d_row["Driver_ID"]
    d_arch = d_row["Archetype"]
    d_zone = d_row["Primary_Zone"]
    base_lat, base_lon = zone_lat_lon[d_zone]
    
    assigned_vehicle = df_vehicles.iloc[d_idx]
    v_id = assigned_vehicle["Vehicle_ID"]
    v_wear = assigned_vehicle["Wear_Condition"]
    
    for t_idx in range(15):
        t_id = f"T{trip_counter:03d}"
        day_offset = int(t_idx % 7)
        hour_base = 8 + int((t_idx * 1.5) % 14)
        if d_row["Shift_Preference"] == "Night":
            hour_base = 21 + int(t_idx % 6)
            if hour_base >= 24:
                hour_base -= 24
                
        trip_start_time = start_base_date + timedelta(days=day_offset, hours=hour_base, minutes=int(np.random.randint(0, 45)))
        duration_minutes = int(np.random.randint(14, 38))
        trip_end_time = trip_start_time + timedelta(minutes=duration_minutes)
        
        t_type = np.random.choice(trip_types, p=[0.45, 0.30, 0.15, 0.10])
        
        curr_lat = base_lat + np.random.uniform(-0.02, 0.02)
        curr_lon = base_lon + np.random.uniform(-0.02, 0.02)
        
        trip_speeds = []
        trip_acc_y = []
        trip_acc_x = []
        trip_acc_z = []
        trip_gyro_z = []
        
        cur_speed = 0.0
        phone_mount = np.random.choice(["Handlebar_Mount", "Pocket"], p=[0.85, 0.15])
        
        for m in range(duration_minutes):
            ts = trip_start_time + timedelta(minutes=m)
            
            if m < 2 or m > duration_minutes - 3:
                target_speed = np.random.uniform(5, 25)
            else:
                if d_arch == "Aggressive":
                    target_speed = np.random.uniform(35, 68)
                elif d_arch == "Distracted_Erratic":
                    target_speed = np.random.uniform(15, 52)
                else:
                    target_speed = np.random.uniform(25, 45)
            
            speed_delta = (target_speed - cur_speed) * 0.4 + np.random.normal(0, 3.0)
            cur_speed = np.clip(cur_speed + speed_delta, 0, 75)
            
            ay = (speed_delta / 3.6) / 60.0 * 20.0
            if d_arch == "Aggressive":
                if np.random.rand() < 0.18:
                    ay = np.random.uniform(-4.8, -3.2)
                elif np.random.rand() < 0.20:
                    ay = np.random.uniform(2.8, 4.2)
            elif d_arch == "Distracted_Erratic":
                if np.random.rand() < 0.12:
                    ay = np.random.uniform(-3.8, -2.9)
                elif np.random.rand() < 0.10:
                    ay = np.random.uniform(2.5, 3.5)
            else:
                if np.random.rand() < 0.03:
                    ay = np.random.uniform(-3.2, -2.6)
                else:
                    ay = np.random.normal(0, 0.8)
                    
            if d_arch == "Aggressive":
                ax = np.random.normal(0, 1.8)
                gz = np.random.normal(0, 35.0)
            elif d_arch == "Distracted_Erratic":
                ax = np.random.normal(0, 1.4)
                gz = np.random.normal(0, 28.0)
            else:
                ax = np.random.normal(0, 0.7)
                gz = np.random.normal(0, 14.0)
                
            gx = np.random.normal(0, 8.0)
            gy = np.random.normal(0, 12.0)
            
            az_base = 9.81
            if v_wear == "Suspension_Wear":
                az_noise = np.random.normal(0, 2.6 + (cur_speed / 20.0))
            elif v_wear == "Bearing_Misalignment":
                az_noise = np.random.normal(0, 1.4)
                gx += np.random.normal(0, 18.0)
                gy += np.random.normal(0, 22.0)
            elif v_wear == "Brake_Warp" and ay < -1.5:
                az_noise = np.random.normal(0, 3.1)
                gx += np.random.normal(0, 25.0)
            else:
                az_noise = np.random.normal(0, 0.6)
                
            if phone_mount == "Pocket":
                az_noise *= 0.7
                gx += np.random.normal(0, 10.0)
                gy += np.random.normal(0, 10.0)
                
            az = az_base + az_noise
            
            curr_lat += (cur_speed * 1000 / 3600 * 60) / 111320 * np.cos(np.radians(45)) * 0.01 * np.random.choice([1, -1, 0.5])
            curr_lon += (cur_speed * 1000 / 3600 * 60) / (111320 * np.cos(np.radians(curr_lat))) * 0.01 * np.random.choice([1, -1, 0.5])
            
            trip_speeds.append(cur_speed)
            trip_acc_y.append(ay)
            trip_acc_x.append(ax)
            trip_acc_z.append(az)
            trip_gyro_z.append(gz)
            
            telemetry_records.append({
                "Telemetry_ID": f"TEL_{telemetry_counter:06d}",
                "Trip_ID": t_id,
                "Timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
                "Minute_Offset": m + 1,
                "Latitude": round(float(curr_lat), 6),
                "Longitude": round(float(curr_lon), 6),
                "Altitude_Meters": round(float(880 + np.random.normal(0, 5)), 1),
                "Speed_KMH": round(float(cur_speed), 2),
                "Acceleration_X": round(float(ax), 3),
                "Acceleration_Y": round(float(ay), 3),
                "Acceleration_Z": round(float(az), 3),
                "Gyro_X": round(float(gx), 2),
                "Gyro_Y": round(float(gy), 2),
                "Gyro_Z": round(float(gz), 2),
                "Phone_Mount": phone_mount
            })
            telemetry_counter += 1
            
        avg_speed = round(float(np.mean(trip_speeds)), 2)
        max_speed = round(float(np.max(trip_speeds)), 2)
        dist_km = round(float(avg_speed * (duration_minutes / 60.0)), 2)
        
        trip_records.append({
            "Trip_ID": t_id,
            "Driver_ID": d_id,
            "Vehicle_ID": v_id,
            "Trip_Type": t_type,
            "Trip_Date": trip_start_time.strftime("%Y-%m-%d"),
            "Start_Time": trip_start_time.strftime("%Y-%m-%d %H:%M:%S"),
            "End_Time": trip_end_time.strftime("%Y-%m-%d %H:%M:%S"),
            "Duration_Minutes": duration_minutes,
            "Distance_KM": dist_km,
            "Avg_Speed_KMH": avg_speed,
            "Max_Speed_KMH": max_speed
        })
        trip_counter += 1

df_trips = pd.DataFrame(trip_records)
df_telemetry = pd.DataFrame(telemetry_records)

df_drivers.to_csv("Drivers.csv", index=False)
df_vehicles.to_csv("Vehicles.csv", index=False)
df_trips.to_csv("Trips.csv", index=False)
df_telemetry.to_csv("Telemetry.csv", index=False)

print(f"Generated {len(df_drivers)} drivers, {len(df_vehicles)} vehicles, {len(df_trips)} trips, {len(df_telemetry)} telemetry records.")
