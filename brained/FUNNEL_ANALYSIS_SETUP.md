# Funnel Analysis Setup Guide

## Why You're Seeing No Data

The Funnel Analysis page shows **0** for all metrics because:

1. **No Funnels Exist** - You haven't created or seeded any funnels yet
2. **No Supporting Data** - Even if funnels exist, they need page views and user events to analyze

## Quick Fix: Seed the Data

### Step 1: Go to Seed Data Manager
Navigate to: **Admin → Seed Data Manager** (or go to `/admin/seed-data`)

### Step 2: Seed Required Data in This Order

1. **Funnels** (Click "Seed" on the Funnels card)
   - Creates sample funnels like "Checkout Flow" and "Cart Recovery"
   
2. **Page Views** (Click "Seed" on the Page Views card)
   - Recommended: 500 records (default)
   - Creates navigation data for pageview events in funnels
   
3. **User Events** (Click "Seed" on the User Events card)
   - Recommended: 200 records (default)
   - Creates click and custom events for funnel tracking

### Step 3: Refresh Funnel Analysis
- Go back to the Funnel Analysis page
- Select a funnel from the dropdown
- Click "Refresh" to load the data

## Alternative: Quick Seed All

Click the **"Seed All"** button in the Seed Data Manager to seed all data types at once.

## What You'll See After Seeding

After seeding, you'll see:
- ✅ **Total Entries** - Users who started the funnel
- ✅ **Completed** - Users who finished all steps
- ✅ **Conversion Rate** - Percentage who completed
- ✅ **Total Dropoff** - Users who left the funnel
- ✅ **Funnel Steps** - Visual flow with dropoff rates
- ✅ **Step Comparison** - Bar chart comparing steps

## Creating Custom Funnels

After seeding, you can also create your own funnels:

1. Click **"Create Funnel"** button
2. Name your funnel (e.g., "Sign Up Flow")
3. Add steps with event types:
   - **pageview** - Tracks page visits
   - **click** - Tracks button/element clicks
   - **custom** - Tracks custom events
4. Click "Create Funnel"

## Troubleshooting

### Still No Data After Seeding?
- Check browser console for errors
- Ensure MongoDB is running
- Verify server is running on `http://localhost:5000`
- Check that API_BASE is configured correctly in `.env`

### Filters Returning Empty?
- Try removing all filters first
- Use "Last 30 Days" date range for more data
- Clear device/country/UTM filters

## Need Help?
Check the console logs - the page now shows helpful error messages when:
- ❌ No funnels are found
- ❌ Analysis returns empty data
- ❌ Server connection fails
