from fastapi import APIRouter, HTTPException, status as http_status, Depends
from typing import List, Dict, Any
from models.category import Category, CategoryDB
from models.device import DeviceDB
from models.base import Base
from services.database_service import get_db
from services.tdengine_service import tdengine_service
from services.config_service import ConfigService
from sqlalchemy.orm import Session
import json

router = APIRouter()

@router.post("/sync-tdengine", response_model=Dict[str, Any])
def sync_tdengine_schema(db: Session = Depends(get_db)):
    """同步所有分类到TDengine超级表"""
    if not ConfigService.is_tdengine_enabled():
        return {"status": "skipped", "message": "TDengine is disabled"}
    
    # Check connection first
    if not tdengine_service.connect():
        return {"status": "error", "message": "Failed to connect to TDengine"}

    categories = db.query(CategoryDB).all()
    results = {"success": [], "failed": []}
    
    for cat_db in categories:
        # Parse parameters
        parameters = cat_db.parameters
        if isinstance(parameters, str):
            parameters = json.loads(parameters)
            
        try:
            # Use code if available, else fallback to name
            st_name = cat_db.code if hasattr(cat_db, 'code') and cat_db.code else cat_db.name
            
            success = tdengine_service.create_super_table(st_name, parameters)
            if success:
                results["success"].append(st_name)
            else:
                results["failed"].append(st_name)
        except Exception as e:
            st_name = cat_db.code if hasattr(cat_db, 'code') and cat_db.code else cat_db.name
            results["failed"].append(f"{st_name} ({str(e)})")
            
    return results

@router.get("/", response_model=List[Category])
def get_all_categories(db: Session = Depends(get_db)):
    """获取所有分类"""
    category_dbs = db.query(CategoryDB).all()
    categories = []
    for cat_db in category_dbs:
        parameters = cat_db.parameters
        if isinstance(parameters, str):
            parameters = json.loads(parameters)
        
        categories.append(Category(
            id=cat_db.id,
            name=cat_db.name,
            code=cat_db.code if hasattr(cat_db, 'code') and cat_db.code else cat_db.name, # Fallback for existing data
            description=cat_db.description,
            parameters=parameters,
            created_at=cat_db.created_at,
            updated_at=cat_db.updated_at
        ))
    return categories

@router.post("/", response_model=Category, status_code=http_status.HTTP_201_CREATED)
def create_category(category: Category, db: Session = Depends(get_db)):
    """创建分类"""
    existing_category = db.query(CategoryDB).filter(CategoryDB.code == category.code).first()
    if existing_category:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"分类编码 {category.code} 已存在"
        )
    
    # parameters validation?
    
    # parameters_json = json.dumps(category.parameters) if not isinstance(category.parameters, str) else category.parameters

    category_db = CategoryDB(
        id=category.id,
        name=category.name,
        code=category.code,
        description=category.description,
        parameters=category.parameters, # SQLAlchemy handles list -> JSON conversion
        created_at=category.created_at,
        updated_at=category.updated_at
    )
    
    db.add(category_db)
    db.commit()
    db.refresh(category_db)
    
    # Try to create TDengine Super Table if enabled
    if ConfigService.is_tdengine_enabled():
        try:
            # Use category code as super table name
            tdengine_service.create_super_table(category.code, category.parameters)
        except Exception as e:
            print(f"Warning: Failed to create TDengine super table for {category.code}: {e}")

    return category

@router.put("/{category_id}", response_model=Category)
def update_category(category_id: str, category: Category, db: Session = Depends(get_db)):
    """更新分类"""
    db_category = db.query(CategoryDB).filter(CategoryDB.id == category_id).first()
    if not db_category:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"分类 {category_id} 不存在"
        )
    
    # Check code uniqueness if code changed
    old_code = db_category.code
    if old_code != category.code:
        existing_category = db.query(CategoryDB).filter(CategoryDB.code == category.code).first()
        if existing_category:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"分类编码 {category.code} 已存在"
            )
        
        # Update associated devices
        # Device.type stores the category code
        db.query(DeviceDB).filter(DeviceDB.type == old_code).update({DeviceDB.type: category.code})

    parameters_json = json.dumps(category.parameters) if not isinstance(category.parameters, str) else category.parameters

    db_category.name = category.name
    db_category.code = category.code
    db_category.description = category.description
    db_category.parameters = parameters_json
    db_category.updated_at = category.updated_at
    
    db.commit()
    db.refresh(db_category)
    
    # Re-construct Category object to ensure parameters are list
    parameters = db_category.parameters
    if isinstance(parameters, str):
        parameters = json.loads(parameters)

    return Category(
        id=db_category.id,
        name=db_category.name,
        code=db_category.code,
        description=db_category.description,
        parameters=parameters,
        created_at=db_category.created_at,
        updated_at=db_category.updated_at
    )

@router.delete("/{category_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_category(category_id: str, db: Session = Depends(get_db)):
    """删除分类"""
    db_category = db.query(CategoryDB).filter(CategoryDB.id == category_id).first()
    if not db_category:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"分类 {category_id} 不存在"
        )
    
    db.delete(db_category)
    db.commit()
    return None
