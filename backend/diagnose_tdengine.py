import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.config_service import ConfigService
from services.tdengine_service import tdengine_service

def diagnose():
    print("=== TDengine 诊断工具 ===")
    
    # 1. 检查配置
    config = ConfigService.get_tdengine_config()
    print(f"\n1. 当前配置:")
    print(f"   Host: {config.get('host')}")
    print(f"   Port: {config.get('port')}")
    print(f"   User: {config.get('user')}")
    print(f"   Database: {config.get('database')}")
    print(f"   Enabled: {config.get('enabled')}")
    
    if not config.get('enabled'):
        print("\n[警告] TDengine 未启用。请在系统设置中启用 TDengine。")
        return

    # 2. 测试连接
    print(f"\n2. 测试连接...")
    if tdengine_service.connect():
        print("   [成功] 连接成功")
    else:
        print("   [失败] 无法连接到 TDengine。请检查服务是否运行，以及防火墙设置。")
        return

    # 3. 检查超级表
    print(f"\n3. 检查超级表...")
    try:
        tables = tdengine_service.execute_query("SHOW STABLES")
        print(f"   发现 {len(tables)} 个超级表:")
        for t in tables:
            # TDengine 3.x REST API uses 'stable_name', 2.x or native might use 'name'
            name = t.get('name') or t.get('stable_name')
            print(f"   - {name}")
    except Exception as e:
        print(f"   查询超级表失败: {e}")

    # 4. 检查最近的日志/错误 (模拟)
    # 实际上我们无法查看到之前的控制台日志，但我们可以提示用户查看。

if __name__ == "__main__":
    diagnose()
