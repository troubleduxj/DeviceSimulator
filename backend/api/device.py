from fastapi import APIRouter, HTTPException, status as http_status
from typing import List
from models.device import Device, DeviceStatus
from services.device_service import DeviceService

router = APIRouter()

@router.get("/", response_model=List[Device])
def get_all_devices():
    """获取所有设备"""
    return DeviceService.get_all_devices()

@router.get("/{device_id}", response_model=Device)
def get_device(device_id: str):
    """根据ID获取设备"""
    device = DeviceService.get_device_by_id(device_id)
    if not device:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"设备 {device_id} 不存在"
        )
    return device

@router.post("/", response_model=Device, status_code=http_status.HTTP_201_CREATED)
def create_device(device: Device):
    """创建设备"""
    try:
        return DeviceService.create_device(device)
    except ValueError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{device_id}", response_model=Device)
def update_device(device_id: str, device: Device):
    """更新设备"""
    # 确保设备ID一致
    device.id = device_id
    updated_device = DeviceService.update_device(device_id, device)
    if not updated_device:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"设备 {device_id} 不存在"
        )
    return updated_device

@router.delete("/{device_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_device(device_id: str):
    """删除设备"""
    success = DeviceService.delete_device(device_id)
    if not success:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"设备 {device_id} 不存在"
        )
    return None

@router.patch("/{device_id}/status/{status}", response_model=Device)
def update_device_status(device_id: str, status: DeviceStatus):
    """更新设备状态"""
    updated_device = DeviceService.update_device_status(device_id, status)
    if not updated_device:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"设备 {device_id} 不存在"
        )
    return updated_device
