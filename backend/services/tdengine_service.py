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

    def check_connection(self) -> bool:
        """检查连接状态，如果未连接尝试连接"""
        if self.conn:
            # 如果已连接，直接返回True
            # 注意：Native模式下连接可能断开，但为了性能，这里不做实时检测
            # 实际操作失败时会自动重连
            return True
        
        # 尝试连接
        return self.connect()
    
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
            
            # 特殊处理：表已存在 (Code 1539: Table already exists)
            # 即使使用了 IF NOT EXISTS，某些版本的 REST API 可能仍会返回此错误
            if res.get('code') == 1539:
                return 0

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
        """为设备创建表 (独立表，不带Tags)"""
        table_name = f"`device_{device.id}`"
        
        # 构建表结构SQL
        columns_sql = "ts TIMESTAMP"
        for param in device.parameters:
            col_type = self._get_tdengine_type(param.type)
            col_name = param.id if hasattr(param, 'id') and param.id else param.name
            columns_sql += f", `{col_name}` {col_type}"
        
        # 独立表不应该有TAGS
        sql = f"CREATE TABLE IF NOT EXISTS {table_name} ({columns_sql})"
        
        try:
            self.execute_update(sql)
            return True
        except Exception as e:
            print(f"创建表失败: {e}")
            return False
    
    def _get_tdengine_type(self, param_type: str) -> str:
        """将参数类型转换为TDengine数据类型"""
        if param_type == "数值" or param_type == "NUMBER":
            return "DOUBLE"
        elif param_type == "布尔" or param_type == "BOOLEAN":
            return "BOOL"
        elif param_type == "字符串" or param_type == "STRING":
            return "NCHAR(255)"
        else:
            return "DOUBLE"  # 默认使用DOUBLE类型

    def delete_device_data(self, device_id: str, start_time: str = None, end_time: str = None) -> bool:
        """
        删除设备数据
        :param device_id: 设备ID
        :param start_time: 开始时间 (ISO string or timestamp)
        :param end_time: 结束时间 (ISO string or timestamp)
        :return: 是否成功
        """
        if not self.conn and not self.connect():
            return False
            
        table_name = f"`device_{device_id}`"
        
        try:
            sql = f"DELETE FROM {table_name}"
            conditions = []
            
            if start_time:
                conditions.append(f"ts >= '{start_time}'")
            if end_time:
                conditions.append(f"ts <= '{end_time}'")
                
            if conditions:
                sql += f" WHERE {' AND '.join(conditions)}"
            else:
                # 如果没有指定时间范围，TDengine可能需要WHERE子句，这里使用一个总是为真的条件来清除所有
                # 或者直接 DELETE FROM table (取决于版本支持)
                # 安全起见，使用宽泛的时间范围
                sql += " WHERE ts >= 0"

            print(f"执行删除SQL: {sql}")
            
            if self.use_rest:
                res = self._rest_execute(sql)
                if res.get('code') == 0 or res.get('status') == 'succ':
                    return True
                else:
                    print(f"删除数据失败 (REST): {res}")
                    return False
            else:
                self.conn.execute(sql)
                return True
                
        except Exception as e:
            print(f"删除数据异常: {e}")
            return False

    def get_device_data_range(self, device_id: str) -> Dict[str, str]:
        """获取设备数据的时间范围"""
        if not self.conn and not self.connect():
            return None
        
        table_name = f"`device_{device_id}`"
        # TDengine uses FIRST(ts), LAST(ts)
        sql = f"SELECT FIRST(ts), LAST(ts) FROM {table_name}"
        
        try:
            results = self.execute_query(sql)
            if results and len(results) > 0:
                row = results[0]
                # row is a dict, values should be [start, end]
                values = list(row.values())
                if len(values) >= 2:
                    start = values[0]
                    end = values[1]
                    
                    if start is None or end is None:
                        return None

                    # Convert to ISO string
                    if hasattr(start, 'isoformat'): start = start.isoformat()
                    if hasattr(end, 'isoformat'): end = end.isoformat()
                    
                    return {"start_time": str(start), "end_time": str(end)}
            return None
        except Exception as e:
            # Table might not exist or empty
            return None

    def get_database_info(self) -> Dict[str, Any]:
        """获取数据库基本信息"""
        if not self.conn and not self.connect():
             return None
        
        info = {
            "version": "Unknown",
            "created_at": "Unknown",
            "tables_count": 0,
            "stables_count": 0
        }

        try:
            # 1. Get Version
            res_ver = self.execute_query("SELECT SERVER_VERSION()")
            if res_ver and len(res_ver) > 0:
                # result key might be 'server_version()' or similar
                info["version"] = list(res_ver[0].values())[0]

            # 2. Get Tables Count
            # Note: SHOW TABLES in 3.x might be different or require specific handling
            # Using count if possible, or just length of list
            # SHOW TABLES might return many rows, so be careful. 
            # Ideally: SELECT COUNT(*) FROM information_schema.ins_tables WHERE db_name = ...
            # But let's try SHOW TABLES first as it's more standard across versions for simple use
            
            # Using information_schema is better for 3.x
            try:
                # Try 3.x style
                res_tables = self.execute_query(f"SELECT COUNT(*) FROM information_schema.ins_tables WHERE db_name = '{self.database}'")
                if res_tables and len(res_tables) > 0:
                     info["tables_count"] = list(res_tables[0].values())[0]
                
                res_stables = self.execute_query(f"SELECT COUNT(*) FROM information_schema.ins_stables WHERE db_name = '{self.database}'")
                if res_stables and len(res_stables) > 0:
                     info["stables_count"] = list(res_stables[0].values())[0]
            except:
                # Fallback to SHOW command (might be slow for many tables)
                try:
                    tables = self.execute_query("SHOW TABLES")
                    info["tables_count"] = len(tables)
                    
                    stables = self.execute_query("SHOW STABLES")
                    info["stables_count"] = len(stables)
                except:
                    pass

            # 3. Get Database Info (Created Time)
            try:
                # SHOW DATABASES returns list. Filter for current db.
                dbs = self.execute_query("SHOW DATABASES")
                for db in dbs:
                    # Key might be 'name' or 'name' (lowercase/uppercase)
                    name = db.get('name') or db.get('Name')
                    if name == self.database:
                        created = db.get('created_time') or db.get('create_time')
                        if created:
                            info["created_at"] = created
                        break
            except:
                pass

            return info

        except Exception as e:
            print(f"获取数据库信息失败: {e}")
            return info

    def create_super_table(self, name: str, parameters: List[Dict[str, Any]]) -> bool:
        """创建超级表 (支持Schema Evolution)"""
        # 1. Check if STABLE exists
        exists_sql = f"SHOW STABLES LIKE '{name}'"
        existing = self.execute_query(exists_sql)
        
        if not existing:
            # Create new
            columns_sql = "ts TIMESTAMP"
            custom_tags_sql = ""
            
            for param in parameters:
                p_type = param.type if hasattr(param, 'type') else param.get('type')
                p_id = param.id if hasattr(param, 'id') else param.get('id')
                
                # Skip reserved tag names that are hardcoded below
                if p_id in ['device_name', 'device_model']:
                    continue

                # Check is_tag
                is_tag = param.is_tag if hasattr(param, 'is_tag') else param.get('is_tag', False)
                
                col_type = self._get_tdengine_type(p_type)
                
                if is_tag:
                    custom_tags_sql += f", `{p_id}` {col_type}"
                else:
                    columns_sql += f", `{p_id}` {col_type}"
            
            tags_sql = "device_name NCHAR(64), device_model NCHAR(64)" + custom_tags_sql
            sql = f"CREATE STABLE IF NOT EXISTS `{name}` ({columns_sql}) TAGS ({tags_sql})"
            
            try:
                print(f"创建超级表 SQL: {sql}")
                self.execute_update(sql)
                return True
            except Exception as e:
                print(f"创建超级表失败: {e}")
                return False
        else:
            # STABLE exists, check columns and add missing ones
            try:
                desc_sql = f"DESCRIBE `{name}`"
                cols_info = self.execute_query(desc_sql)
                
                existing_cols = set()
                for col in cols_info:
                    # Handle different case keys if necessary, usually capitalized
                    field = col.get('Field') or col.get('field')
                    if field:
                        existing_cols.add(field)
                
                for param in parameters:
                    p_id = param.id if hasattr(param, 'id') else param.get('id')
                    # Check is_tag
                    is_tag = param.is_tag if hasattr(param, 'is_tag') else param.get('is_tag', False)
                    
                    if p_id not in existing_cols:
                        # Add column or tag
                        p_type = param.type if hasattr(param, 'type') else param.get('type')
                        col_type = self._get_tdengine_type(p_type)
                        
                        if is_tag:
                            # Add TAG (TDengine supports ADD TAG?)
                            # ALTER STABLE <stable_name> ADD TAG <tag_name> <tag_type>;
                            alter_sql = f"ALTER STABLE `{name}` ADD TAG `{p_id}` {col_type}"
                        else:
                            alter_sql = f"ALTER STABLE `{name}` ADD COLUMN `{p_id}` {col_type}"
                            
                        print(f"更新超级表结构: {alter_sql}")
                        self.execute_update(alter_sql)
                        
                return True
            except Exception as e:
                print(f"检查/更新超级表失败: {e}")
                return False

    def create_sub_table(self, super_table: str, sub_table: str, tags: Dict[str, Any]) -> bool:
        """创建子表"""
        # TAGS values
        # We need to match the order of tags defined in create_super_table
        # Standard tags: device_name, device_model (device_id removed)
        
        tag_vals = [
            f"'{tags.get('device_name')}'", 
            f"'{tags.get('device_model', '')}'"
        ]
        
        # Append custom tags (must be passed in 'tags' dict)
        # We iterate over keys that are NOT standard keys
        standard_keys = {'device_id', 'device_name', 'device_model'}
        
        for k, v in tags.items():
            if k not in standard_keys:
                if v is None:
                    tag_vals.append("NULL")
                elif isinstance(v, str):
                    tag_vals.append(f"'{v}'")
                elif isinstance(v, bool):
                    tag_vals.append("true" if v else "false")
                else:
                    tag_vals.append(str(v))
        
        tag_values_str = ", ".join(tag_vals)
        
        sql = f"CREATE TABLE IF NOT EXISTS {sub_table} USING `{super_table}` TAGS ({tag_values_str})"
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
    
    def get_device_data(self, device_id: str, limit: int = 100, start_time: str = None, end_time: str = None) -> List[Dict[str, Any]]:
        """获取设备的数据，支持分页和时间范围"""
        table_name = f"`device_{device_id}`"
        
        conditions = []
        if start_time:
            conditions.append(f"ts >= '{start_time}'")
        if end_time:
            conditions.append(f"ts <= '{end_time}'")
            
        where_clause = ""
        if conditions:
            where_clause = f"WHERE {' AND '.join(conditions)}"
            
        # If time range is specified, default to ASC order usually for playback/charts, 
        # but existing behavior is DESC for "latest data". 
        # Let's keep DESC default if no time range, but ASC if time range?
        # Actually for "get history" usually we want ASC.
        # But to not break existing "latest 100" calls (which expect DESC), we should be careful.
        # Let's add an order param or infer.
        
        # If start_time/end_time is present, likely we want history -> ASC
        # But let's stick to DESC for consistency unless we change API signature more.
        # Or just return DESC and let frontend reverse.
        
        # For playback, we probably want ALL data in range, or at least a lot.
        # Let's handle limit.
        
        sql = f"SELECT * FROM {table_name} {where_clause} ORDER BY ts DESC LIMIT {limit}"
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
