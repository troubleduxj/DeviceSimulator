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
        
        physics_config = cat_db.physics_config or {}
        if isinstance(physics_config, str):
            try: physics_config = json.loads(physics_config)
            except: physics_config = {}

        logic_rules = cat_db.logic_rules or []
        if isinstance(logic_rules, str):
            try: logic_rules = json.loads(logic_rules)
            except: logic_rules = []
        
        categories.append(Category(
            id=cat_db.id,
            name=cat_db.name,
            code=cat_db.code if hasattr(cat_db, 'code') and cat_db.code else cat_db.name, # Fallback for existing data
            description=cat_db.description,
            visual_model=cat_db.visual_model or "Generic", # Added field
            parameters=parameters,
            physics_config=physics_config,
            logic_rules=logic_rules,
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
    
    category_db = CategoryDB(
        id=category.id,
        name=category.name,
        code=category.code,
        description=category.description,
        visual_model=category.visual_model, # Added field
        parameters=[p.dict() for p in category.parameters], # SQLAlchemy handles list -> JSON conversion
        physics_config=category.physics_config,
        logic_rules=category.logic_rules,
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
            import traceback
            traceback.print_exc()
            print(f"Warning: Failed to create TDengine super table for {category.code}: {e}")

    return Category(
        id=category_db.id,
        name=category_db.name,
        code=category_db.code,
        description=category_db.description,
        visual_model=category_db.visual_model, # Added field
        parameters=category.parameters, # Use input parameters which are already Pydantic models
        physics_config=category.physics_config,
        logic_rules=category.logic_rules,
        created_at=category_db.created_at,
        updated_at=category_db.updated_at
    )

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

    db_category.name = category.name
    db_category.code = category.code
    db_category.description = category.description
    db_category.visual_model = category.visual_model # Added field
    db_category.parameters = [p.dict() for p in category.parameters]
    db_category.physics_config = category.physics_config
    db_category.logic_rules = category.logic_rules
    db_category.updated_at = category.updated_at
    
    db.commit()
    db.refresh(db_category)
    
    # Re-construct Category object to ensure parameters are list
    parameters = db_category.parameters
    if isinstance(parameters, str):
        parameters = json.loads(parameters)
    
    physics_config = db_category.physics_config or {}
    if isinstance(physics_config, str):
        try: physics_config = json.loads(physics_config)
        except: physics_config = {}

    logic_rules = db_category.logic_rules or []
    if isinstance(logic_rules, str):
        try: logic_rules = json.loads(logic_rules)
        except: logic_rules = []

    return Category(
        id=db_category.id,
        name=db_category.name,
        code=db_category.code,
        description=db_category.description,
        visual_model=db_category.visual_model, # Added field
        parameters=parameters,
        physics_config=physics_config,
        logic_rules=logic_rules,
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
