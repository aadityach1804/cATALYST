use std::process::{Command, Child, Stdio};
use std::sync::{Arc, Mutex};
use tauri::RunEvent;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let backend_child: Arc<Mutex<Option<Child>>> = Arc::new(Mutex::new(None));
    let backend_child_exit = Arc::clone(&backend_child);

    tauri::Builder::default()
        .setup(move |_app| {
            // Determine executable directory
            let exe_dir = std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|p| p.to_path_buf()))
                .unwrap_or_default();

            // Candidate paths for backend binary across production and dev
            let candidate_paths = vec![
                exe_dir.join("cadence-backend.exe"),
                exe_dir.join("binaries").join("cadence-backend-x86_64-pc-windows-msvc.exe"),
                std::path::PathBuf::from("src-tauri/binaries/cadence-backend-x86_64-pc-windows-msvc.exe"),
                std::path::PathBuf::from("dist/cadence-backend.exe"),
            ];

            let mut spawned_child = None;

            // 1. Try launching the compiled standalone backend binary
            for path in candidate_paths {
                if path.exists() {
                    if let Ok(child) = Command::new(&path)
                        .stdout(Stdio::null())
                        .stderr(Stdio::null())
                        .spawn()
                    {
                        spawned_child = Some(child);
                        break;
                    }
                }
            }

            // 2. Dev Fallback: launch python directly if binary is not yet compiled
            if spawned_child.is_none() {
                if let Ok(child) = Command::new("python")
                    .args(["backend/server.py"])
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .spawn()
                {
                    spawned_child = Some(child);
                }
            }

            if let Some(child) = spawned_child {
                if let Ok(mut guard) = backend_child.lock() {
                    *guard = Some(child);
                }
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |_app_handle, event| {
            // Automatically terminate backend process when user closes the window
            if let RunEvent::Exit = event {
                if let Ok(mut guard) = backend_child_exit.lock() {
                    if let Some(mut child) = guard.take() {
                        let _ = child.kill();
                    }
                }
            }
        });
}