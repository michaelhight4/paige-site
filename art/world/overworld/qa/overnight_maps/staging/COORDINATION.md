# Two World Design runs are editing this staging folder at the same time (seen 00:48 CT, Oct 23)

Run B (restart, started 00:40 CT) found another run (A) writing overnight_maps.py / drive.py / drive.log / ../SUMMARY.md concurrently.
To avoid clobbering, Run B will NOT edit overnight_maps.py, drive.py or SUMMARY.md from now on unless this file says Run A has stopped.
Run B already added the "GAME DEV DATA LAYER" block (GD trainers / pickups / encounter tables, ids kept stable) and the
world_data.py DEX-id assert relax in sandbox/overworld/tools/world_data.py. Run A has merged that block into its copy (00:48).
Known gap for whoever drives next: run.py executes the hook through runpy.run_path, so module globals (GD_ENC) are lost;
drive.py must read tables from the draft maps (m.gd_tables) and write encounters_overnight.json, then run --check a second time.
If you are Run A and still active, append a line below with the time so Run B stays read-only.
