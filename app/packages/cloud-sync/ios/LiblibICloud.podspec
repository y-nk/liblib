require 'json'

# Resolve version from the package.json next to this podspec so the spec stays
# in lockstep with the JS package. The pod itself is consumed via a `:path`
# reference from `app.config.ts`'s Expo config plugin; CocoaPods doesn't need
# a registry entry.
package = JSON.parse(File.read(File.expand_path('../package.json', __dir__)))

Pod::Spec.new do |s|
  s.name             = 'LiblibICloud'
  s.version          = package['version']
  s.summary          = 'iCloud Drive bridge for the Liblib cloud-sync engine.'
  s.description      = 'Wraps NSFileCoordinator + ubiquity-container access so the JS-side ICloudAdapter can read/write the Liblib/ folder inside the app\'s iCloud Drive container.'
  s.homepage         = 'https://github.com/y-nk/liblib'
  s.license          = { :type => 'MIT' }
  s.author           = { 'Liblib' => 'noreply@example.com' }
  s.source           = { :path => '.' }
  s.platform         = :ios, '15.1'
  s.swift_version    = '5.0'

  s.source_files     = '*.{swift,m,h}'

  s.dependency 'React-Core'
end
