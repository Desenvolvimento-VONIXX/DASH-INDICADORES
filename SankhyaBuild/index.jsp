<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ page import="br.com.sankhya.jape.EntityFacade" %>
<%@ page import="br.com.sankhya.jape.dao.JdbcWrapper" %>
<%@ page import="br.com.sankhya.modelcore.util.EntityFacadeFactory" %>
<%@ page import="javax.sql.DataSource" %>
<%@ page import="java.sql.Connection" %>
<%@ page import="java.sql.DatabaseMetaData" %>
<% EntityFacade dwfFacade=EntityFacadeFactory.getDWFFacade(); JdbcWrapper jdbcWrapper=dwfFacade.getJdbcWrapper(); String databaseProductName="unknown" ; if (jdbcWrapper.isOracle()){ databaseProductName="oracle" ; } else if (jdbcWrapper.isSQLServer()){ databaseProductName="mssql" ; } else if (jdbcWrapper.isMysql()){ databaseProductName="mysql" ; } jdbcWrapper.closeSession(); %><!doctype html>
<html lang="en">
<head>
<snk:load></snk:load>
<script type="text/javascript" id="sankhyaVariable">
    var Params = {};
    var base_path = "${BASE_FOLDER}/".replace("\\", "");
    localStorage.setItem("base_folder", base_path);
    window.baseFolder = base_path;
    window.resolveAsset = function (url) {
        url = String(url);
        if (url[0] == ".") {
            url = url.slice(1, url.length);
        }
        if (url[0] == "/") {
            url = url.slice(1, url.length);
        }
        //   const origin = window.location.origin;
        const path = window.location.pathname.replace(/\/[^/]*\.(.*)$/, "");

        const base_folder = window.localStorage.getItem("base_folder");
        const urlFinal = (path + "/" + base_folder + url).replace("//", "/");
        // remove first "/"
        if (urlFinal[0] == "/") {
            return urlFinal.slice(1, urlFinal.length);
        }
        return urlFinal;
    };
    window.dbDialect = "<%= databaseProductName %>"
</script>
<script></script>
<meta charset="UTF-8"/>
<link rel="icon" type="image/svg+xml" href=${BASE_FOLDER}/vite.svg />
<script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Vite + React + TS</title>
<script type="module" crossorigin src="${BASE_FOLDER}/assets/index-B5rLBI_L.js"></script>
<link rel="stylesheet" crossorigin href="${BASE_FOLDER}/assets/index-_A6pxr2_.css">
</head>
<body>
<div id="root"></div>
</body>
</html>