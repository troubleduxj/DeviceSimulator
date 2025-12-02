import taos
import requests
import base64
import json
from typing import List, Dict, Any
from config.config import settings
from services.config_service import ConfigService
from models.device import Device

class TDengineService:
    def _load_config(self):
        """从数据库加载TDengine配置"""
        config = ConfigService.get_tdengine_connection_params()
        self.host = config.get("host", "localhost")
        self.port = int(config.get("port", 6030))
        self.user = config.get("user", "root")
        self.password = config.get("password", "taosdata")
        self.database = config.get("database", "device_simulator")
        
        # 判断连接模式：端口6041使用REST API，其他使用Native
        self.use_rest = (self.port == 6041)
    
    def __init__(self):
        """初始化TDengine服务"""
        self.conn = None
        self.use_rest = False
        self._load_config()  # 初始化时加载配置
    
    def _get_rest_headers(self):
        auth_str = f"{self.user}:{self.password}"
        auth_bytes = auth_str.encode('utf-8')
        auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')
        return {
            'Authorization': f'Basic {auth_b64}',
            'Content-Type': 'text/plain'
        }

    def _rest_execute(self, sql: str, use_db: bool = True) -> Dict:
        """通过REST API执行SQL"""
        url = f"http://{self.host}:{self.port}/rest/sql"
        if use_db and self.database:
            url = f"{url}/{self.database}"
            
        try:
            response = requests.post(
                url, 
                headers=self._get_rest_headers(), 
                data=sql.encode('utf-8')
            )
            
            if response.status_code != 200:
                print(f"REST request failed: {response.status_code} - {response.text}")
                return {"code": -1, "desc": f"HTTP {response.status_code}"}
                
            return response.json()
        except Exception as e:
            print(f"REST execution error: {e}")
            return {"code": -1, "desc": str(e)}

    def connect(self):
        """连接到TDengine数据库"""
        # 每次连接前重新加载配置，确保使用最新配置
        self._load_config()
        
        print(f"正在连接TDengine: host={self.host}, port={self.port}, user={self.user}, mode={'REST' if self.use_rest else 'Native'}")
        
        if self.use_rest:
            try:
                # 验证连接：查询服务器版本
                # 不指定数据库，因为数据库可能还未创建
                res = self._rest_execute("SELECT SERVER_VERSION()", use_db=False)
                
                # 兼容 TDengine 2.x (status='succ') 和 3.x (code=0)
                if res.get('code') == 0 or res.get('status') == 'succ':
                    print("TDengine REST连接成功")
                    self.conn = True # 标记为已连接
                    self._create_database()
                    return True
                else:
                    print(f"TDengine REST连接响应错误: {res}")
                    return False
            except Exception as e:
                print(f"TDengine REST连接异常: {e}")
                return False
        else:
            # Native连接方式
            try:
                self.conn = taos.connect(
                    host=self.host,
                    port=self.port,
                    user=self.user,
                    password=self.password,
                    database=self.database
                )
                print("TDengine Native连接成功")
                # 创建数据库（如果不存在）
                self._create_database()
                # 切换到该数据库
                self.conn.execute(f"USE {self.database}")
                return True
            except Exception as e:
                print(f"连接TDengine Native失败: {e}")
                print(f"错误详情: {str(e)}")
                return False
    
    def disconnect(self):
        """断开与TDengine的连接"""
        if not self.use_rest and self.conn:
            try:
                self.conn.close()
            except:
                pass
        self.conn = None
    
    def _create_database(self):
        """创建数据库（如果不存在）"""
        sql = f"CREATE DATABASE IF NOT EXISTS {self.database}"
        if self.use_rest:
            # 创建数据库时不能指定数据库路径
            self._rest_execute(sql, use_db=False)
        else:
            try:
                # 不切换数据库，直接创建
                self.conn.execute(sql)
            except Exception as e:
                print(f"创建数据库失败: {e}")
    
    def execute_query(self, sql: str) -> List[Dict[str, Any]]:
        """执行查询SQL"""
        if not self.conn:
            if not self.connect():
                return []
        
        if self.use_rest:
            res = self._rest_execute(sql)
            # 处理结果
            if res.get('code') == 0:
                # TDengine 3.x format: {"code":0, "column_meta":[[name, type, len],...], "data":[[...]]}
                if 'column_meta' in res and 'data' in res:
                    cols = [meta[0] for meta in res['column_meta']]
                    # print(f"DEBUG: SQL='{sql}' Cols={cols}")  # Uncomment for debugging
                    data = res['data']
                    return [dict(zip(cols, row)) for row in data]
                # TDengine 2.x format: {"status":"succ", "head":[...], "data":[[...]]}
                elif 'head' in res and 'data' in res:
                    cols = res['head']
                    data = res['data']
                    return [dict(zip(cols, row)) for row in data]
            elif res.get('status') == 'succ':
                cols = res.get('head', [])
                data = res.get('data', [])
                return [dict(zip(cols, row)) for row in data]
            
            print(f"查询返回错误: {res}")
            return []
            
        else:
            # Native implementation
            try:
                cursor = self.conn.cursor()
                cursor.execute(sql)
                
                # 获取列名
                columns = [desc[0] for desc in cursor.description]
                
                # 获取结果
                result = []
                for row in cursor.fetchall():
                    result.append(dict(zip(columns, row)))
                
                cursor.close()
                return result
            except Exception as e:
                print(f"执行查询失败: {e}")
                # 尝试重连
                try:
                    self.connect()
                except:
                    pass
                return []
    
    def execute_update(self, sql: str) -> int:
        """执行更新SQL（INSERT、UPDATE、DELETE等）"""
        if not self.conn:
            if not self.connect():
                raise Exception("无法连接到TDengine")
        
        if self.use_rest:
            res = self._rest_execute(sql)
            if res.get('code') == 0 or res.get('status') == 'succ':
                return res.get('rows', 1)
            raise Exception(f"TDengine REST执行失败: {res}")
        else:
            try:
                cursor = self.conn.cursor()
                affected_rows = cursor.execute(sql)
                self.conn.commit()
                cursor.close()
                return affected_rows
            except Exception as e:
                print(f"执行更新失败: {e}")
                self.conn.rollback()
                raise e
    
    def create_table_for_device(self, device: Device) -> bool:
        """为设备创建表"""
        table_name = f"`device_{device.id}`"
        
        # 构建表结构SQL
        columns_sql = "ts TIMESTAMP"
        for param in device.parameters:
            col_type = self._get_tdengine_type(param.type)
            # Use param.id if available, otherwise sanitize param.name or use it as is (risky)
            # Assuming param.id is available and valid for column name
            col_name = param.id
            columns_sql += f", `{col_name}` {col_type}"
        
        # 构建标签SQL
        tags_sql = f"device_id NCHAR(32), device_name NCHAR(64), device_type NCHAR(32)"
        
        # 创建表SQL
        sql = f"CREATE TABLE IF NOT EXISTS {table_name} ({columns_sql}) TAGS ({tags_sql})"
        
        try:
            self.execute_update(sql)
            return True
        except Exception as e:
            print(f"创建表失败: {e}")
            return False
    
    def _get_tdengine_type(self, param_type: str) -> str:
        """将参数类型转换为TDengine数据类型"""
        if param_type == "数值":
            return "DOUBLE"
        elif param_type == "布尔":
            return "BOOL"
        elif param_type == "字符串":
            return "NCHAR(255)"
        else:
            return "DOUBLE"  # 默认使用DOUBLE类型

    def create_super_table(self, name: str, parameters: List[Any]) -> bool:
        """创建超级表"""
        # columns
        columns_sql = "ts TIMESTAMP"
        for param in parameters:
            # Handle both object (Device.parameters) and dict (Category.parameters)
            p_type = param.type if hasattr(param, 'type') else param.get('type')
            # Use ID for column name instead of name (which is for display)
            p_id = param.id if hasattr(param, 'id') else param.get('id')
            
            col_type = self._get_tdengine_type(p_type)
            columns_sql += f", `{p_id}` {col_type}"
        
        # tags (Fixed tags for now)
        tags_sql = "device_id NCHAR(64), device_name NCHAR(64), device_model NCHAR(64)"
        
        sql = f"CREATE STABLE IF NOT EXISTS {name} ({columns_sql}) TAGS ({tags_sql})"
        try:
            print(f"创建超级表 SQL: {sql}")
            self.execute_update(sql)
            return True
        except Exception as e:
            print(f"创建超级表失败: {e}")
            return False

    def create_sub_table(self, super_table: str, sub_table: str, tags: Dict[str, Any]) -> bool:
        """创建子表"""
        # TAGS values
        # We need to match the order of tags defined in create_super_table
        # tags: device_id, device_name, device_model
        
        tag_values = f"'{tags.get('device_id')}', '{tags.get('device_name')}', '{tags.get('device_model', '')}'"
        
        sql = f"CREATE TABLE IF NOT EXISTS {sub_table} USING {super_table} TAGS ({tag_values})"
        try:
            print(f"创建子表 SQL: {sql}")
            self.execute_update(sql)
            return True
        except Exception as e:
            print(f"创建子表失败: {e}")
            return False
    
    def insert_data(self, device_id: str, data: Dict[str, Any]) -> bool:
        """插入单条数据"""
        table_name = f"`device_{device_id}`"
        
        # 构建插入SQL
        ts = data.get("timestamp", "NOW")
        
        columns = ["ts"]
        values = [f"'{ts}'"]
        
        for param_name, value in data["data"].items():
            columns.append(f"`{param_name}`")
            if isinstance(value, str):
                values.append(f"'{value}'")
            elif isinstance(value, bool):
                 # TDengine BOOL uses true/false or 1/0
                 values.append("true" if value else "false")
            else:
                values.append(str(value))
        
        columns_sql = ", ".join(columns)
        values_sql = ", ".join(values)
        
        sql = f"INSERT INTO {table_name} ({columns_sql}) VALUES ({values_sql})"
        
        try:
            # print(f"插入数据 SQL: {sql}")
            self.execute_update(sql)
            return True
        except Exception as e:
            print(f"插入数据失败: {e}")
            return False
    
    def batch_insert_data(self, device_id: str, data_list: List[Dict[str, Any]]) -> bool:
        """批量插入数据"""
        if not data_list:
            return True
        
        table_name = f"`device_{device_id}`"
        
        # Get columns from the first data item
        first_data = data_list[0]
        columns = ["ts"]
        # Use keys from the first item as the column structure
        param_names = list(first_data["data"].keys())
        columns.extend(param_names)
        
        columns_sql = ", ".join(columns)
        
        # 构建批量插入SQL
        sql = f"INSERT INTO {table_name} ({columns_sql}) VALUES "
        
        values_parts = []
        for data in data_list:
            ts = data.get("timestamp", "NOW")
            vals = [f"'{ts}'"]
            
            for param_name in param_names:
                value = data["data"].get(param_name)
                if isinstance(value, str):
                    vals.append(f"'{value}'")
                elif isinstance(value, bool):
                     vals.append("true" if value else "false")
                elif value is None:
                    vals.append("NULL")
                else:
                    vals.append(str(value))
            
            values_parts.append(f"({', '.join(vals)})")
            
        sql += ", ".join(values_parts)
        
        try:
            # print(f"批量插入数据 SQL: {sql}")
            self.execute_update(sql)
            return True
        except Exception as e:
            print(f"批量插入数据失败: {e}")
            return False
    
    def get_device_data(self, device_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """获取设备的最新数据"""
        table_name = f"`device_{device_id}`"
        sql = f"SELECT * FROM {table_name} ORDER BY ts DESC LIMIT {limit}"
        return self.execute_query(sql)
    
    def delete_device_table(self, device_id: str) -> bool:
        """删除设备对应的表"""
        table_name = f"`device_{device_id}`"
        sql = f"DROP TABLE IF EXISTS {table_name}"
        try:
            self.execute_update(sql)
            return True
        except Exception as e:
            print(f"删除表失败: {e}")
            return False

# 创建全局TDengine服务实例
tdengine_service = TDengineService()
