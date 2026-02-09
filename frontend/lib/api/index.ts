/**
 * Единая точка входа для всех API запросов
 * 
 * Автоматически генерируется из OpenAPI спецификации backend
 * Для обновления запустите: bun run generate:api
 */

// Импортируем сгенерированный клиент
import { 
    DefaultService,
    type Personnel,
    type PersonnelCreate,
    type PersonnelUpdate,
    type PersonnelListResponse,
    type Phone,
    type PhoneCreate,
    type PhoneUpdate,
    type PhoneListResponse,
    type Equipment,
    type EquipmentCreate,
    type EquipmentUpdate,
    type EquipmentListResponse,
    type Movement,
    type MovementCreate,
    type StorageDevice,
    type StorageDeviceCreate,
    type StorageDeviceUpdate,
    OpenAPI
  } from './generated';
  
  // Настраиваем базовый URL
  OpenAPI.BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  OpenAPI.WITH_CREDENTIALS = true;
  OpenAPI.CREDENTIALS = 'include';
  
  // Экспортируем типы
  export type {
    Personnel,
    PersonnelCreate,
    PersonnelUpdate,
    PersonnelListResponse,
    Phone,
    PhoneCreate,
    PhoneUpdate,
    PhoneListResponse,
    Equipment,
    EquipmentCreate,
    EquipmentUpdate,
    EquipmentListResponse,
    Movement,
    MovementCreate,
    StorageDevice,
    StorageDeviceCreate,
    StorageDeviceUpdate,
  };
  
  // Создаём удобную обёртку
  export const api = {
    // Аутентификация
    auth: {
      login: (username: string, password: string) =>
        DefaultService.loginAuthLoginPost({ username, password }),
      
      me: () =>
        DefaultService.getCurrentUserInfoAuthMeGet(),
      
      logout: () =>
        DefaultService.logoutAuthLogoutPost(),
    },
  
    // Персонал
    personnel: {
      list: (params?: { skip?: number; limit?: number; status?: string; search?: string }) =>
        DefaultService.listPersonnelPersonnelGet(params),
      
      getById: (id: number) =>
        DefaultService.getPersonnelPersonnelPersonnelIdGet(id),
      
      create: (data: PersonnelCreate) =>
        DefaultService.createPersonnelPersonnelPost(data),
      
      update: (id: number, data: PersonnelUpdate) =>
        DefaultService.updatePersonnelPersonnelPersonnelIdPut(id, data),
      
      delete: (id: number) =>
        DefaultService.deletePersonnelPersonnelPersonnelIdDelete(id),
      
      checkClearance: (id: number) =>
        DefaultService.checkClearancePersonnelPersonnelIdClearanceCheckGet(id),
    },
  
    // Телефоны
    phones: {
      list: (params?: { skip?: number; limit?: number; status?: string; search?: string; owner_id?: number }) =>
        DefaultService.listPhonesPhonesGet(params),
      
      getById: (id: number) =>
        DefaultService.getPhonePhonesPhoneIdGet(id),
      
      create: (data: PhoneCreate) =>
        DefaultService.createPhonePhonesPost(data),
      
      update: (id: number, data: PhoneUpdate) =>
        DefaultService.updatePhonePhonesPhoneIdPut(id, data),
      
      delete: (id: number) =>
        DefaultService.deletePhonePhonesPhoneIdDelete(id),
      
      batchCheckin: (phoneIds: number[]) =>
        DefaultService.batchCheckinPhonesBatchCheckinPost({ phone_ids: phoneIds }),
      
      batchCheckout: (phoneIds: number[]) =>
        DefaultService.batchCheckoutPhonesBatchCheckoutPost({ phone_ids: phoneIds }),
      
      statusReport: () =>
        DefaultService.getStatusReportPhonesReportsStatusGet(),
    },
  
    // Оборудование
    equipment: {
      list: (params?: { skip?: number; limit?: number; equipment_type?: string; status?: string; search?: string }) =>
        DefaultService.listEquipmentEquipmentGet(params),
      
      getById: (id: number) =>
        DefaultService.getEquipmentEquipmentEquipmentIdGet(id),
      
      create: (data: EquipmentCreate) =>
        DefaultService.createEquipmentEquipmentPost(data),
      
      update: (id: number, data: EquipmentUpdate) =>
        DefaultService.updateEquipmentEquipmentEquipmentIdPut(id, data),
      
      delete: (id: number) =>
        DefaultService.deleteEquipmentEquipmentEquipmentIdDelete(id),
      
      getStats: () =>
        DefaultService.getStatisticsEquipmentStatsGet(),
      
      getSealIssues: () =>
        DefaultService.getSealIssuesEquipmentSealsIssuesGet(),
      
      checkSeals: (data: { equipment_ids: number[]; seal_status: string; notes?: string }) =>
        DefaultService.checkSealsEquipmentSealsCheckPost(data),
      
      createMovement: (data: MovementCreate) =>
        DefaultService.createMovementEquipmentMovementsPost(data),
      
      getMovementHistory: (equipmentId: number, params?: { skip?: number; limit?: number }) =>
        DefaultService.getMovementHistoryEquipmentEquipmentIdMovementsGet(equipmentId, params),
    },
  
    // Носители информации
    storageDevices: {
      list: (params?: { skip?: number; limit?: number; equipment_id?: number; status?: string; search?: string }) =>
        DefaultService.listStorageDevicesEquipmentStorageDevicesGet(params),
      
      getById: (id: number) =>
        DefaultService.getStorageDeviceEquipmentStorageDevicesDeviceIdGet(id),
      
      create: (data: StorageDeviceCreate) =>
        DefaultService.createStorageDeviceEquipmentStorageDevicesPost(data),
      
      update: (id: number, data: StorageDeviceUpdate) =>
        DefaultService.updateStorageDeviceEquipmentStorageDevicesDeviceIdPut(id, data),
      
      delete: (id: number) =>
        DefaultService.deleteStorageDeviceEquipmentStorageDevicesDeviceIdDelete(id),
    },
  };
  
  // Дефолтный экспорт
  export default api;