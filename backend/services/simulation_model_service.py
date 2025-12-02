from typing import List, Optional
from models.simulation_model import SimulationModel, SimulationModelDB, Base
from services.database_service import SessionLocal, engine
from sqlalchemy.orm import Session
import json

# 创建数据库表
Base.metadata.create_all(bind=engine)

class SimulationModelService:
    @staticmethod
    def _get_db() -> Session:
        """获取数据库会话"""
        return SessionLocal()
    
    @staticmethod
    def _db_to_pydantic(db_model: SimulationModelDB) -> SimulationModel:
        """将数据库模型转换为Pydantic模型"""
        parameters = db_model.parameters
        if isinstance(parameters, str):
            try:
                parameters = json.loads(parameters)
            except json.JSONDecodeError:
                parameters = []
                
        return SimulationModel(
            id=db_model.id,
            name=db_model.name,
            description=db_model.description,
            parameters=parameters,
            created_at=db_model.created_at,
            updated_at=db_model.updated_at
        )

    @staticmethod
    def get_all_models() -> List[SimulationModel]:
        """获取所有数据模型"""
        db = SimulationModelService._get_db()
        try:
            models_db = db.query(SimulationModelDB).all()
            return [SimulationModelService._db_to_pydantic(m) for m in models_db]
        finally:
            db.close()
    
    @staticmethod
    def get_model_by_id(model_id: str) -> Optional[SimulationModel]:
        """根据ID获取数据模型"""
        db = SimulationModelService._get_db()
        try:
            model_db = db.query(SimulationModelDB).filter(SimulationModelDB.id == model_id).first()
            if not model_db:
                return None
            return SimulationModelService._db_to_pydantic(model_db)
        finally:
            db.close()
            
    @staticmethod
    def create_model(model: SimulationModel) -> SimulationModel:
        """创建数据模型"""
        db = SimulationModelService._get_db()
        try:
            # 检查名称是否已存在
            existing = db.query(SimulationModelDB).filter(SimulationModelDB.name == model.name).first()
            if existing:
                raise ValueError(f"数据模型名称 {model.name} 已存在")
            
            # 序列化参数 (虽然SQLAlchemy JSON类型会自动处理，但为了兼容性保持与DeviceService一致)
            # 注意：如果底层驱动支持JSON，赋值dict即可；如果存为Text，则需dumps
            # 这里直接赋值，假设SQLAlchemy配置正确
            
            db_obj = SimulationModelDB(
                id=model.id,
                name=model.name,
                description=model.description,
                parameters=[p.dict() for p in model.parameters]
            )
            
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            return SimulationModelService._db_to_pydantic(db_obj)
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
            
    @staticmethod
    def update_model(model_id: str, model_update: SimulationModel) -> Optional[SimulationModel]:
        """更新数据模型"""
        db = SimulationModelService._get_db()
        try:
            db_obj = db.query(SimulationModelDB).filter(SimulationModelDB.id == model_id).first()
            if not db_obj:
                return None
            
            db_obj.name = model_update.name
            db_obj.description = model_update.description
            db_obj.parameters = [p.dict() for p in model_update.parameters]
            
            db.commit()
            db.refresh(db_obj)
            return SimulationModelService._db_to_pydantic(db_obj)
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
            
    @staticmethod
    def delete_model(model_id: str) -> bool:
        """删除数据模型"""
        db = SimulationModelService._get_db()
        try:
            db_obj = db.query(SimulationModelDB).filter(SimulationModelDB.id == model_id).first()
            if not db_obj:
                return False
            
            db.delete(db_obj)
            db.commit()
            return True
        finally:
            db.close()
