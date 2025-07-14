echo "=== WRK 性能测试 ==="

# 创建结果目录
RESULTS_DIR="benchmark_results2"
mkdir -p $RESULTS_DIR

# 测试参数
THREADS=4
CONNECTIONS=100
DURATION="10s"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

test_with_wrk() {
    local name=$1
    local port=$2
    local result_file="$RESULTS_DIR/${name}_${TIMESTAMP}.txt"

    echo "测试 $name..."
    echo "结果将保存到: $result_file"

    # 等待服务器启动
    sleep 3

    # 保存测试信息到文件
    {
        echo "=== $name 性能测试结果 ==="
        echo "测试时间: $(date)"
        echo "测试参数: 线程=$THREADS, 连接=$CONNECTIONS, 持续时间=$DURATION"
        echo ""

        echo "--- 根端点 ---"
        wrk -t$THREADS -c$CONNECTIONS -d$DURATION "http://127.0.0.1:$port/"
        echo ""

        echo "--- MCP Lab 端点 ---"
        wrk -t$THREADS -c$CONNECTIONS -d$DURATION "http://127.0.0.1:$port/mcp/lab/"
        echo ""

        echo "--- MCP Other 端点 ---"
        wrk -t$THREADS -c$CONNECTIONS -d$DURATION "http://127.0.0.1:$port/mcp/other/"
        echo ""

    } | tee "$result_file"  # tee 既显示又保存

    echo "结果已保存到: $result_file"
    echo "----------------------------------------"
}

# 依次测试
python main.py &
PID3=$!
test_with_wrk "Main Optimized" 48200
kill $PID3

python unify_route.py &
PID2=$!
test_with_wrk "Unify Route" 48200
kill $PID2

python multi_server.py &
PID1=$!
test_with_wrk "Multi Server" 48200
kill $PID1

# 生成汇总报告
echo "生成汇总报告..."
{
    echo "=== 性能测试汇总报告 ==="
    echo "测试时间: $(date)"
    echo ""

    for file in $RESULTS_DIR/*_${TIMESTAMP}.txt; do
        if [ -f "$file" ]; then
            echo "文件: $(basename $file)"
            # 提取关键指标
            grep -E "Requests/sec:|Latency|Transfer/sec:" "$file" | head -3
            echo ""
        fi
    done
} > "$RESULTS_DIR/summary_${TIMESTAMP}.txt"

echo "汇总报告已生成: $RESULTS_DIR/summary_${TIMESTAMP}.txt"
echo "所有结果文件位于: $RESULTS_DIR/"
