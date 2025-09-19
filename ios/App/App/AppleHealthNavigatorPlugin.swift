import Foundation
import Capacitor
import UIKit

@objc(AppleHealthNavigatorPlugin)
public class AppleHealthNavigatorPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleHealthNavigatorPlugin"
    public let jsName = "AppleHealthNavigator"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openDataAccess", returnType: CAPPluginReturnPromise)
    ]

    @objc func openDataAccess(_ call: CAPPluginCall) {
        let explicitName = call.getString("appName")?.trimmingCharacters(in: .whitespacesAndNewlines)
        let bundleDisplayName = Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String
        let bundleName = Bundle.main.object(forInfoDictionaryKey: "CFBundleName") as? String

        let resolvedName = [explicitName, bundleDisplayName, bundleName, "Workout Tracker"].compactMap { value -> String? in
            guard let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines), !trimmed.isEmpty else {
                return nil
            }
            return trimmed
        }.first ?? "Workout Tracker"

        let allowedCharacters = CharacterSet.urlQueryAllowed
        let encodedName = resolvedName.addingPercentEncoding(withAllowedCharacters: allowedCharacters) ?? resolvedName

        let primary = URL(string: "x-apple-health://sources?source=\(encodedName)")
        let fallback = URL(string: "x-apple-health://sources")
        let settings = URL(string: UIApplication.openSettingsURLString)

        open(urls: [primary, fallback, settings], for: call)
    }

    private func open(urls: [URL?], for call: CAPPluginCall) {
        var remaining = urls

        guard !remaining.isEmpty else {
            call.reject("Unable to open Apple Health.")
            return
        }

        guard let url = remaining.removeFirst() else {
            open(urls: remaining, for: call)
            return
        }

        let next = remaining

        DispatchQueue.main.async {
            UIApplication.shared.open(url, options: [:]) { success in
                if success {
                    call.resolve([
                        "opened": true,
                        "url": url.absoluteString
                    ])
                } else {
                    self.open(urls: next, for: call)
                }
            }
        }
    }
}
