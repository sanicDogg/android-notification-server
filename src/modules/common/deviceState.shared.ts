// common/deviceState.shared.ts

import type { DeviceStateSnapshot, IncomingDeviceState } from '../../db/schema';

export const SINGLE_DEVICE_ID = 'Nothing_phone(1)';

export type UnvalidatedDeviceState = Partial<DeviceStateSnapshot>;

export function mapAndValidateDeviceState(
  item: Partial<IncomingDeviceState>
): IncomingDeviceState {
  if (item.batteryLevel === undefined || item.isWifiConnected === undefined) {
    throw new Error('Missing required fields: batteryLevel or isWifiConnected');
  }

  return {
    batteryLevel: item.batteryLevel,
    isCharging: item.isCharging ?? false,
    isWifiConnected: item.isWifiConnected,
    wifiName: item.wifiName || null,
    isCellularConnected: item.isCellularConnected ?? false,
    signalStrength: item.signalStrength || 'NONE',
    cellularOperator: item.cellularOperator || null,
    cellularOperators: item.cellularOperators || [],
    isAirplaneModeOn: item.isAirplaneModeOn ?? false,
    isBluetoothOn: item.isBluetoothOn ?? false,
    bluetoothName: item.bluetoothName || '',
    isVpnActive: item.isVpnActive ?? false,
    isMediaPlaying: item.isMediaPlaying ?? false,
    isHeadphonesConnected: item.isHeadphonesConnected ?? false,
    volumeLevel: item.volumeLevel ?? 0,
    volumeMax: item.volumeMax ?? 0,
    volumePercent: item.volumePercent ?? 0,
    clipboardText: item.clipboardText || null,
    clipboardCapturedAt: item.clipboardCapturedAt || null,
    timestamp: item.timestamp || Date.now(),
    timestampIso: item.timestampIso || new Date().toISOString(),
    trigger: item.trigger || null,
    type: item.type || 'DEVICE_STATE',
  };
}
