import Capacitor
import UIKit
import WebKit
import HealthKit

class CAPBridgeViewController: CAPViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Set up the bridge with custom configuration
        setupBridge()
        
        // Configure the web view for better performance
        configureWebView()
        
        // Set up HealthKit if available
        setupHealthKit()
    }
    
    private func setupBridge() {
        // Configure bridge settings
        bridge?.config.appendUserAgent("WorkoutTracker-iOS/1.0")
        
        // Add any custom plugins here if needed
        // bridge?.registerPluginInstance(YourCustomPlugin())
    }
    
    private func configureWebView() {
        guard let webView = bridge?.webView else { return }
        
        // Allow inline media playback
        webView.configuration.allowsInlineMediaPlayback = true
        
        // Enable picture-in-picture
        webView.configuration.allowsPictureInPictureMediaPlayback = true
        
        // Set up user content controller for JavaScript messaging
        let userContentController = webView.configuration.userContentController
        
        // Add a script to handle safe area insets
        let safeAreaScript = WKUserScript(
            source: """
                function updateSafeAreaInsets() {
                    const safeAreaTop = \(view.safeAreaInsets.top);
                    const safeAreaBottom = \(view.safeAreaInsets.bottom);
                    const safeAreaLeft = \(view.safeAreaInsets.left);
                    const safeAreaRight = \(view.safeAreaInsets.right);
                    
                    document.documentElement.style.setProperty('--safe-area-inset-top', safeAreaTop + 'px');
                    document.documentElement.style.setProperty('--safe-area-inset-bottom', safeAreaBottom + 'px');
                    document.documentElement.style.setProperty('--safe-area-inset-left', safeAreaLeft + 'px');
                    document.documentElement.style.setProperty('--safe-area-inset-right', safeAreaRight + 'px');
                }
                
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', updateSafeAreaInsets);
                } else {
                    updateSafeAreaInsets();
                }
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        userContentController.addUserScript(safeAreaScript)
    }
    
    private func setupHealthKit() {
        if HKHealthStore.isHealthDataAvailable() {
            let healthStore = HKHealthStore()
            
            // Request authorization for step count
            let stepCountType = HKQuantityType.quantityType(forIdentifier: .stepCount)!
            let readTypes: Set<HKObjectType> = [stepCountType]
            
            healthStore.requestAuthorization(toShare: nil, read: readTypes) { success, error in
                if success {
                    print("HealthKit authorization granted")
                } else {
                    print("HealthKit authorization denied: \(error?.localizedDescription ?? "Unknown error")")
                }
            }
        }
    }
    
    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        
        // Update safe area insets when they change (e.g., device rotation)
        if let webView = bridge?.webView {
            let script = """
                document.documentElement.style.setProperty('--safe-area-inset-top', '\(view.safeAreaInsets.top)px');
                document.documentElement.style.setProperty('--safe-area-inset-bottom', '\(view.safeAreaInsets.bottom)px');
                document.documentElement.style.setProperty('--safe-area-inset-left', '\(view.safeAreaInsets.left)px');
                document.documentElement.style.setProperty('--safe-area-inset-right', '\(view.safeAreaInsets.right)px');
            """
            webView.evaluateJavaScript(script, completionHandler: nil)
        }
    }
}