fn main() {
  let icon_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("icons/icon.ico");

  println!("cargo:rerun-if-changed={}", icon_path.display());

  tauri_build::try_build(
    tauri_build::Attributes::new().windows_attributes(
      tauri_build::WindowsAttributes::new().window_icon_path(&icon_path),
    ),
  )
  .expect("failed to run tauri build");
}
