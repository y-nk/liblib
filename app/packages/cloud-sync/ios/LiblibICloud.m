#import <React/RCTBridgeModule.h>

/**
 * Objective-C shim that registers the Swift `LiblibICloud` class with the
 * React Native bridge under the name `LiblibICloud`. The Swift class is
 * @objc-annotated, so the bridge can locate its methods via the runtime.
 */
@interface RCT_EXTERN_MODULE(LiblibICloud, NSObject)

RCT_EXTERN_METHOD(isAvailable
                  : (RCTPromiseResolveBlock)resolve
                  rejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getFile
                  : (NSString *)path
                  resolver
                  : (RCTPromiseResolveBlock)resolve
                  rejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(putFile
                  : (NSString *)path
                  base64
                  : (NSString *)base64
                  ifMatchEtag
                  : (NSString *)ifMatchEtag
                  resolver
                  : (RCTPromiseResolveBlock)resolve
                  rejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(listFiles
                  : (NSString *)dir
                  resolver
                  : (RCTPromiseResolveBlock)resolve
                  rejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deleteFile
                  : (NSString *)path
                  resolver
                  : (RCTPromiseResolveBlock)resolve
                  rejecter
                  : (RCTPromiseRejectBlock)reject)

@end
