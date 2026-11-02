output "function_urls" {
  value       = { for name, fn in google_cloudfunctions2_function.fn : name => fn.service_config[0].uri }
  description = "URL of each Cloud Function (private: only the App Hosting service account may call them)."
}
