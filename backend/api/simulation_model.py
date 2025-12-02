from fastapi import APIRouter, HTTPException, Body
from typing import List
from models.simulation_model import SimulationModel
from services.simulation_model_service import SimulationModelService

router = APIRouter()

@router.get("/", response_model=List[SimulationModel])
def get_models():
    """获取所有数据模型"""
    return SimulationModelService.get_all_models()

@router.get("/{model_id}", response_model=SimulationModel)
def get_model(model_id: str):
    """获取指定数据模型"""
    model = SimulationModelService.get_model_by_id(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Data model not found")
    return model

@router.post("/", response_model=SimulationModel)
def create_model(model: SimulationModel):
    """创建数据模型"""
    try:
        return SimulationModelService.create_model(model)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{model_id}", response_model=SimulationModel)
def update_model(model_id: str, model: SimulationModel):
    """更新数据模型"""
    try:
        updated = SimulationModelService.update_model(model_id, model)
        if not updated:
            raise HTTPException(status_code=404, detail="Data model not found")
        return updated
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{model_id}")
def delete_model(model_id: str):
    """删除数据模型"""
    if SimulationModelService.delete_model(model_id):
        return {"message": "Data model deleted successfully"}
    raise HTTPException(status_code=404, detail="Data model not found")
