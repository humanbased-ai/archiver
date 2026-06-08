package com.wsi.annotation.api.common.core.mvc;

/**
 * jqGrid请求参数
 * 
 * @ClassName: JqGridParam
 * @Description: TODO(这里用一句话描述这个类的作用)
 * @author link
 * @date 2018年12月14日 下午1:51:17
 *
 */
public class JqGridParam {
	private int current;// 当前页
	private int pageSize;// 分页步长
	private String sidx; // 排序 字段
	private String sord; // asc 或 desc

	public int getCurrent() {
		return current;
	}

	public void setCurrent(int current) {
		this.current = current;
	}

	public int getPageSize() {
		return pageSize;
	}

	public void setPageSize(int pageSize) {
		this.pageSize = pageSize;
	}

	public String getSidx() {
		return sidx;
	}

	public void setSidx(String sidx) {
		this.sidx = sidx;
	}

	public String getSord() {
		return sord;
	}

	public void setSord(String sord) {
		this.sord = sord;
	}

}
